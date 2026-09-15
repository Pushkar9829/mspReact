import { createContext, useContext, useState } from "react";
import { locations } from "../data/catalog.js";

const LocationContext = createContext(null);

export function LocationProvider({ children }) {
  const [location, setLocation] = useState(locations[0]);
  const [open, setOpen] = useState(false);
  return (
    <LocationContext.Provider value={{ location, setLocation, open, setOpen, locations }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useDeliveryLocation() {
  return useContext(LocationContext);
}
