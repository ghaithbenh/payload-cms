# Payload CMS Custom Components (Test Prompt)

You are working inside a Payload CMS + Next.js project.

Your task is to create and use custom admin components in Payload CMS.

---

## Context

Payload CMS allows customization of the admin panel using React components.

You can override:
- Field components
- Cell components
- Admin pages (views)
- Layout elements

All custom components must be React components and can use `"use client"` when needed.
https://payloadcms.com/docs/custom-components/overview

---

## Task

Create a simple custom field component and integrate it into a Payload collection.

---

## Requirements

1. Create a custom React field component:
   - Must be inside `components/CustomField.tsx`
   - Must accept `value` and `onChange`
   - Must update the field value correctly
   - Must be styled minimally

2. Register it inside a Payload collection:
   - Use `admin.components.Field`

3. Ensure it works inside Payload admin panel

---

## Example expected behavior

- The admin panel shows a custom input UI instead of default text input
- User can type and value is saved in MongoDB
- No errors in Next.js or Payload build

---

## Bonus (optional)

Also create:
- Custom Cell component for list view
- Custom Admin dashboard page

---

## Constraints

- Use Payload CMS v3 structure
- Use Next.js App Router compatibility
- Avoid breaking server/client boundaries
- Use `"use client"` only when needed

---

## Goal

A fully working Payload CMS custom component integrated into a collection field.