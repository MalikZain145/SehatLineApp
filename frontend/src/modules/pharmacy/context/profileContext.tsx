import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import pharmacyService from "../services/pharmacyService";

interface Profile {
  fullName: string;
  employeeId: string;
  email: string;
  profileImage: string;
  phone: string;
  department: string;
  shift: string;
  hospital: string;
  counterNumber: string;
}

interface ProfileContextType {
  profile: Profile;
  updateProfile: (data: Partial<Profile>) => void;
  reloadProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  // No fake defaults — everything comes from the logged-in pharmacist's account.
  const [profile, setProfile] = useState<Profile>({
    fullName: "",
    employeeId: "",
    email: "",
    phone: "",
    department: "Pharmacy",
    shift: "Morning (8:00 AM - 4:00 PM)",
    hospital: "",
    profileImage: "",
    counterNumber: "",
  });

  const updateProfile = (data: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  };

  // Pull the real profile from the backend so the menu/header show the actual
  // name + DP immediately (not just when the Profile screen is opened).
  const reloadProfile = async () => {
    try {
      const res = await pharmacyService.getProfile();
      const p = res?.profile;
      if (p) {
        setProfile((prev) => ({
          ...prev,
          fullName: p.name ?? prev.fullName,
          email: p.email ?? prev.email,
          phone: p.phone ?? prev.phone,
          department: p.department || prev.department,
          shift: p.shift || prev.shift,
          hospital: p.hospital || prev.hospital,
          employeeId: p.employeeId || prev.employeeId,
          counterNumber: p.counterNumber ?? prev.counterNumber,
          profileImage: p.profilePic || prev.profileImage,
        }));
      }
    } catch (e) {
      /* offline — keep whatever we have */
    }
  };

  useEffect(() => {
    reloadProfile();
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, reloadProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }
  return context;
};
