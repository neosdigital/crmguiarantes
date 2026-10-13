"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardLabel } from "@/components/ui/card";

export function SimpleBarChart({
  title,
  data,
  dataKey = "count",
  nameKey = "name",
}: {
  title: string;
  data: Record<string, unknown>[];
  dataKey?: string;
  nameKey?: string;
}) {
  return (
    <Card>
      <CardLabel>{title}</CardLabel>
      <div className="mt-4 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-text-secondary">
            Sem dados neste período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey={nameKey} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: 12 }}
                labelStyle={{ color: "var(--foreground)" }}
                itemStyle={{ color: "var(--brand-azure)" }}
                cursor={{ fill: "var(--color-accent-soft)" }}
              />
              <Bar dataKey={dataKey} fill="var(--brand-azure)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
