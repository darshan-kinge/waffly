# Template Catalog

Read approved templates configured in your WhatsApp Business Account directly via `client.templates`.

---

## Listing Templates

```typescript
const page = await client.templates.list({
  wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
  status: "APPROVED",
  limit: 10,
});

for (const tpl of page.data) {
  console.log(`${tpl.name} [${tpl.language}] - Status: ${tpl.status}`);
}
```

---

## Cursor-Based Pagination

If there are more templates than the requested page size, use the cursor returned in `page.paging`:

```typescript
if (page.paging?.cursors?.after) {
  const nextPage = await client.templates.list({
    wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID!,
    status: "APPROVED",
    after: page.paging.cursors.after,
  });

  console.log(`Loaded ${nextPage.data.length} more templates.`);
}
```

---

## Fetching a Single Template

```typescript
const template = await client.templates.get("TEMPLATE_ID");

console.log(template.name, template.language, template.status);
console.log(template.components);
```
