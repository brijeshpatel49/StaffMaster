export const getAvatarUrl = (user, size = 40) => {
  // If user has uploaded a real profile photo -> use it
  if (user?.profilePhoto) {
    return user.profilePhoto;
  }

  // Based on gender -> use default image
  if (String(user?.gender || "").toLowerCase() === "female") {
    return "/default_female.png";
  }

  // Default: male image for male + unknown + null
  return "/default_male.png";
};
