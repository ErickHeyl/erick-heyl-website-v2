import {
  get_all_guests,
  get_main_and_secondary_guests,
  get_guests_for_admin_table,
  update_rsvp_info_many,
  Guest,
} from "@/models/guests_model";
import { NextResponse } from "next/server";

const get_formatted_guests = async () => {
  const guests = await get_all_guests();

  return guests.map((guest: Guest) => ({
    ...guest,
    full_name: `${guest.first_name} ${guest.last_name}`,
  }));
};

const get_formatted_guest_party = async (
  first_name: string,
  last_name: string,
) => {
  const formatted_guest_party = await get_main_and_secondary_guests(
    first_name,
    last_name,
  );

  if (formatted_guest_party === null) {
    throw new Error("Guest not found");
  }

  return formatted_guest_party;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ a: string }> },
) {
  const { a } = await params;
  try {
    if (a === "get_formatted_guests") {
      const guests = await get_formatted_guests();
      return NextResponse.json(guests);
    } else if (a === "update_rsvp_info_many") {
      const { updatedGuests } = await request.json();
      await update_rsvp_info_many(updatedGuests);
      return NextResponse.json({ message: "RSVP info updated successfully!" });
    } else if (a === "get_guest_info_from_name") {
      const { first_name, last_name } = await request.json();
      const guest_info = await get_formatted_guest_party(first_name, last_name);
      return NextResponse.json(guest_info);
    } else if (a === "get_guests_for_admin_table") {
      const guests = await get_guests_for_admin_table();
      return NextResponse.json(guests);
    }
  } catch (error) {
    const err = error as Error;
    if (err.message === "Guest not found") {
      return NextResponse.json({
        error: `Name not found on the guest list. Please check the spelling and try again.`,
      });
    }
    return NextResponse.json({ error: "An unexpected error occurred." });
  }

  return NextResponse.json({ error: "Invalid request." });
}
