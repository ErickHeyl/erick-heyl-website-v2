This is a Wedding Website Template

## Demos
Official Base: [https://heylproductions.vercel.app/](https://heylproductions.vercel.app/)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```


##  Customize Your Wedding Website

To make this site truly yours, update the configuration file with your wedding details.

Head over to:

```sh
/data/site_config.js
```

## Example Update:

```js
export const site_config = {
  groom: "Bob",
  bride: "Alice",
  weddingDate: "2025-06-15",
  venue: "Sunset Beach Resort, Hawaii",
  rsvpDeadline: "2025-05-01",
};
```

## Setup Postgres server

(Optional) Go to [vercel's serverless postgres](https://vercel.com/marketplace/neon) and deploy a vercel serverless postgresql db through 'Neon'.


Here is the create statement for the guests table. It is the only table required. 
```sql
create table public.guests
(
    guest_id     serial
        primary key,
    first_name   varchar(255) not null,
    last_name    varchar(255) not null,
    rsvp_status  varchar(255) default 'Pending'::character varying,
    notes        text,
    active       boolean      default true,
    party_number integer,
    host         char
);

```
When adding a guest, the `host` parameter takes in a `'g'` or a `'b'` for the bride/groom. This only affects what will display on the admin view of the table.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

TBD
