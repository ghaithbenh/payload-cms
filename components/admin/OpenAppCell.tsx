"use client";

import type { DefaultCellComponentProps } from "payload";
import Link from "next/link";

const OpenAppCell: React.FC<DefaultCellComponentProps> = ({ rowData }) => {
  const id = rowData?.id as string;
  if (!id) return null;

  return (
    <Link
      href={`${process.env.NEXT_PUBLIC_FRONTEND_URL}/tasks/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#fff",
        backgroundColor: "#22c55e",
        borderRadius: "6px",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Open App
    </Link>
  );
};

export default OpenAppCell;
