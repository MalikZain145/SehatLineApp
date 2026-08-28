import React, { createContext, useContext, useState } from "react";

type Patient = {
  id: string;
  cardNo: string;
  patientName: string;
  doctorName: string;
  status: "Waiting" | "Ready";
  time: string;
  counter?: string;
  collectedTime?: string;
};

type PharmacyContextType = {
  queuePatients: Patient[];
  completedPatients: Patient[];
  completePatient: (id: string) => void;
  markPatientReady: (
    id: string,
    counter: string
  ) => void;
};

const PharmacyContext = createContext<PharmacyContextType | null>(null);

export const PharmacyProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [queuePatients, setQueuePatients] = useState<Patient[]>([
    {
      id: "1",
      cardNo: "P023",
      patientName: "Ali Khan",
      doctorName: "Ahmed",
      status: "Waiting",
      time: "10:30 AM",
    },
    {
      id: "2",
      cardNo: "P024",
      patientName: "Sara Ahmed",
      doctorName: "Usman",
      status: "Waiting",
      time: "10:45 AM",
    },
    {
      id: "3",
      cardNo: "P025",
      patientName: "Ahmed Raza",
      doctorName: "Ali",
      status: "Ready",
      time: "11:00 AM",
      counter: "Counter 3",
    },
  ]);

  const [completedPatients, setCompletedPatients] = useState<Patient[]>([]);
  const markPatientReady = (
  id: string,
  counter: string
) => {
  setQueuePatients((prev) =>
    prev.map((patient) =>
      patient.id === id
        ? {
            ...patient,
            status: "Ready",
            counter,
          }
        : patient
    )
  );
};

  const completePatient = (id: string) => {
    const patient = queuePatients.find((p) => p.id === id);

    if (!patient) return;

    setCompletedPatients((prev) => [
      ...prev,
      {
        ...patient,
        collectedTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setQueuePatients((prev) =>
      prev.filter((p) => p.id !== id)
    );
  };

  return (
    <PharmacyContext.Provider
      value={{
  queuePatients,
  completedPatients,
  completePatient,
  markPatientReady,
}}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);

  if (!context)
    throw new Error("usePharmacy must be inside PharmacyProvider");

  return context;
};