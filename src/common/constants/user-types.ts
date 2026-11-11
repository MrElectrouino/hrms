// Legacy master.UserType IDs (seeded in prisma/seed.ts; BR-UM-29).
// Menu visibility is keyed off these IDs (BR-UM-20), and they are the
// authorization roles used by @Roles() (D-022).
export enum UserType {
  Executive = 1,
  Manager = 2,
  SystemAdmin = 3,
  HRAdmin = 4,
}
