-- Add border_color column to cards table
-- Values: 'black' (default), 'gold', 'silver', 'white', 'borderless'
ALTER TABLE cards ADD COLUMN IF NOT EXISTS border_color text NOT NULL DEFAULT 'black';

-- Backfill gold border cards (punk = Black Lotus Unknown Planechase, pssc = Secret Lair Showcase Planes)
-- These IDs come from Scryfall API border_color=gold for plane/phenomenon cards
UPDATE cards SET border_color = 'gold' WHERE id IN (
  '4122eda0-f33e-41bd-84f2-15b3a797d108','847b7b50-9262-4c35-be7a-00e9d2fb581e',
  '6080747e-7d56-404d-a08c-e6a35af60698','0ee28cd1-b50d-4de5-8d07-0e22cd9b011b',
  'c1fd6112-f71c-4f3d-979a-9a1178132338','72d646af-0572-49fb-bb40-2390f40ed709',
  'b1440f8e-49cc-4f62-b80c-33c89d709dc6','46e49a31-3023-4fe7-8928-38658d71462b',
  '3ec0f146-e732-4524-b8f2-4220367fb528','77abe064-5185-434f-9364-8fb0854c0d31',
  'f8a197a4-1e89-4772-8851-73dd2ffbf329','a422e17c-f0a3-48f4-ad55-1b78adc2ecf8',
  '57e2826a-7d0f-4227-981f-161587a70830','bb4c608e-07d2-4fd8-b291-5c102afca5f6',
  '22cfcc84-3709-4e1c-8100-b6d7d4e226b8','894be3e2-455f-4f9b-a2a4-6dfeaf7402d2',
  'f7d4a7fe-df1d-46de-8509-f021f2edd0ca','67156703-f6e2-4804-8cb0-57d7a98845b4',
  '44f6daf9-e3fa-474e-a6af-356c619f8d22','d248f19c-6fe5-4e42-ab77-81c41bacebbb',
  'de1a9f98-bbfc-4ae7-b919-a5f652825138','864746af-2a6c-49d8-953d-6e2dfa9e2c2a',
  'ee17ba4a-18b0-46a0-adad-c5db51b0367d','fd836214-3995-4912-a527-4ddfa975bb91',
  '7810d18b-32be-485c-95df-8aabf89e57e7','07252eb1-084c-4ecf-b015-dd00a6ea44ef',
  '2d65e2d8-bab3-4e4f-9cd7-f11ff3aa87a5','31a2845c-9fc8-4d77-9ce0-a402eac46533',
  '68762271-fffe-4a7f-9c8f-c8add913617e','c84ebff2-2040-4e6b-a4e1-a604d773ab0b',
  '6955d29c-0891-44ab-9c6f-2e2abc5729ff','e9e3a5b4-0ffb-42b1-9ba0-2e959577afd7',
  '61aa1c16-3491-4549-983d-448aecaebb8a','8ea684de-c544-444c-ab5c-5b86b0b0fc71',
  '598d7f8d-fd60-40ff-8d56-2e38ca446b82','8f3d801a-d021-40bf-8c88-adb0cc431756',
  '0381e7be-c75f-4ac9-ad21-1f10a904c771','6a88e7e7-a6f9-4ef2-b817-710546d3e8be',
  '3c94c2c8-46fc-49da-a37b-460e7464aa08','e88001d1-339d-4143-8ff5-ff09ef4adfb5',
  'c0cf1c34-0e8f-4a1f-90aa-f827b48b81d3','6d241115-60b8-4fab-9877-4e2d35d638b9',
  '56826f4f-2bbe-464a-b023-faa83aa1c392','4c2d1022-3aaa-4139-bd11-ddc18a7c9cef',
  'd0ff1a68-0424-4a9d-b07e-8426a38f86a6','f82a89a6-f558-476c-a57d-5a1e5405320a',
  'a10f326e-51eb-44b8-9208-ee9db7e7c328','ed9d28e4-e317-458f-a5ab-40faedc53826',
  '9935490b-9bc7-48f5-9a11-59a043e346fb','690ee95a-39b9-4e8e-af43-b7a133249a45',
  '7514322e-a277-43db-80b4-7ee189040d32'
);
