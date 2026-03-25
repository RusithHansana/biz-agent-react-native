export type ServiceType = {
  id: string;
  name: string;
  description?: string;
  price?: string;
};

export type TimeSlot = {
  day: string;
  start: string;
  end: string;
};

export type BusinessContact = {
  phone?: string;
  email?: string;
  website?: string;
};

export type BusinessProfile = {
  name: string;
  tagline: string;
  location: string;
  services: ServiceType[];
  hours: TimeSlot[];
  contact?: BusinessContact;
};
