import { get_formatted_guests } from "@/controllers/guests_controller";
import { NextResponse } from "next/server";

export async function GET() {
  const guests = await get_formatted_guests();
  return NextResponse.json(guests);
}
