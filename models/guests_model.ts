import pool from "@/models/db_model";

export interface Guest {
  guest_id: number;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  notes: string | null;
  active: boolean;
}

export const get_all_guests = async () => {
  const results = await pool.query("SELECT * FROM guests WHERE active = true;");
  return results.rows;
};

export const get_guests_for_admin_table = async () => {
  const results = await pool.query(
    "SELECT first_name, last_name, rsvp_status, host FROM guests WHERE active = true;",
  );
  return results.rows;
};

export const get_guest_id_from_guest_name = async (
  first_name: string,
  last_name: string,
) => {
  const clean_first_name = first_name.trim().toLowerCase();
  const clean_last_name = last_name.trim().toLowerCase();
  const query =
    "SELECT guest_id FROM guests WHERE first_name = $1 AND last_name = $2 AND active = true";
  const guests = await pool.query(query, [clean_first_name, clean_last_name]);
  return guests.rows.length === 0 ? null : guests.rows[0].guest_id;
};

export const get_guest_info_from_name = async (
  first_name: string,
  last_name: string,
) => {
  const clean_first_name = first_name.trim().toLowerCase();
  const clean_last_name = last_name.trim().toLowerCase();
  const query =
    "SELECT * FROM guests WHERE LOWER(first_name) = $1 AND LOWER(last_name) = $2 AND active = true";
  const guest_info = await pool.query(query, [
    clean_first_name,
    clean_last_name,
  ]);
  return guest_info.rows.length === 0 ? null : guest_info.rows[0];
};

export const update_rsvp_info = async (
  guest_id: number,
  rsvp_status: string,
) => {
  try {
    const query = `
      UPDATE guests 
      SET rsvp_status = $2 
      WHERE guest_id = $1
    `;
    await pool.query(query, [guest_id, rsvp_status]);
  } catch (err) {
    console.error("Error updating status", err);
  }
};

export const update_rsvp_info_many = async (guestData: Guest[]) => {
  try {
    const tempValues = guestData
      .map(
        (g) =>
          `(${g.guest_id}, '${g.first_name}', '${g.last_name}', '${g.rsvp_status}')`,
      )
      .join(", ");

    const query = `
      WITH updates(guest_id, first_name, last_name, rsvp_status) AS (
        VALUES
          ${tempValues}
      )
      UPDATE guests 
      SET rsvp_status = updates.rsvp_status, first_name = updates.first_name, last_name = updates.last_name 
      FROM updates
      WHERE guests.guest_id = updates.guest_id;
    `;

    await pool.query(query);
  } catch (err) {
    console.error("Error updating status", err);
  }
};

export const get_main_and_secondary_guests = async (
  first_name: string,
  last_name: string,
) => {
  const clean_first_name = first_name.trim().toLowerCase();
  const clean_last_name = last_name.trim().toLowerCase();
  const query = `
  SELECT 
    guest_id,
    first_name,
    last_name,
    rsvp_status,
    notes,
    active
  FROM 
    guests
  WHERE 
    party_number = (SELECT party_number FROM guests WHERE LOWER(first_name) = $1 AND LOWER(last_name) = $2);
`;

  try {
    const { rows } = await pool.query(query, [
      clean_first_name,
      clean_last_name,
    ]);
    return rows.length === 0 ? null : rows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
};
