import { Guest, get_all_guests } from "@/models/guests_model";

export const get_formatted_guests = async () => {
  const guests = await get_all_guests();

  return guests.map((guest: Guest) => ({
    ...guest,
    full_name: `${guest.first_name} ${guest.last_name}`,
  }));
};
