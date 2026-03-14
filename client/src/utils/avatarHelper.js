export const getAvatarUrl = (user, size = 80) => {
  // Priority 1: uploaded photo
  if (user?.profilePhoto) return user.profilePhoto;

  // Priority 2: gender based color
  const name = encodeURIComponent(user?.fullName || "User");
  const length = 2;
  let bg = "f59e0b"; // default amber

  if (user?.gender === "male")   bg = "3b82f6"; // blue
  if (user?.gender === "female") bg = "ec4899"; // pink
  if (user?.gender === "other")  bg = "8b5cf6"; // purple

  return `https://ui-avatars.com/api/?name=${name}&background=${bg}&color=fff&size=${size}&length=${length}`;
};
