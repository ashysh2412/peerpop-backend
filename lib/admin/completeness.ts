/** What a profile still needs, in the order the admin page shows it. Pure, so it can be tested. */
export type ProfileFacts = {
  hasProfile: boolean;
  photo: boolean;
  city: boolean;
  bio: boolean;
  skills: number;
  niches: number;
  channels: number;
  videos: number;
};

export const PROFILE_STEPS = 7;

export function profileGaps(f: ProfileFacts): string[] {
  if (!f.hasProfile) return ["Profile"];
  const gaps: [boolean, string][] = [
    [f.photo, "Photo"],
    [f.city, "City"],
    [f.skills > 0, "Skills"],
    [f.niches > 0, "Niches"],
    [f.bio, "Bio"],
    [f.channels > 0, "Instagram/YouTube"],
    [f.videos > 0, "Videos"],
  ];
  return gaps.filter(([done]) => !done).map(([, label]) => label);
}
