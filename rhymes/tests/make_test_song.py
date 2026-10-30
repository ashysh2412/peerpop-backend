"""Synthetic 12-second "song" at 112 bpm: sung-style tones on a simple melody plus a drum on every beat. Used by the tests."""
import numpy as np, subprocess, sys
sr=16000; bpm=112; beat=60/bpm; total=12.0
t=np.arange(int(sr*total))/sr
song=np.zeros_like(t)
notes=[262,294,330,349,392,349,330,294]  # a simple nursery melody
rng=np.random.default_rng(1)
# sung syllables: one every beat for 2 bars, then pairs (faster) for 1 bar, rest a bar; repeat
i=0; time=0.25
while time<total-0.5:
    bar=int(time/beat)//4 % 4
    if bar==3: time+=beat; continue
    dur=beat*0.8 if bar<2 else beat*0.4
    f=notes[i%len(notes)]; i+=1
    a,b=int(time*sr),int((time+dur)*sr)
    tt=t[a:b]-time
    env=np.minimum(1,tt/0.04)*np.minimum(1,(dur-tt)/0.08)
    tone=sum((0.6/h)*np.sin(2*np.pi*f*h*tt) for h in range(1,6))
    song[a:b]+=0.5*env*tone
    time+=dur if bar<2 else beat*0.5
# drum on every beat so tempo detection has something to find
for k in range(int(total/beat)):
    a=int(k*beat*sr); n=int(0.05*sr)
    song[a:a+n]+=0.6*np.exp(-np.arange(n)/(0.01*sr))*rng.standard_normal(n)
song=(song/np.abs(song).max()*0.9).astype(np.float32)
out=sys.argv[1] if len(sys.argv)>1 else "song.wav"
p=subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(sr),"-ac","1","-i","-",out],input=song.tobytes())
print("wrote", out, p.returncode)
