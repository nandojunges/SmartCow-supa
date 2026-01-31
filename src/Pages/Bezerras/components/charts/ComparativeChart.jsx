// ComparativeChart.jsx
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ComparativeChart({
  data = [],
  animals = [],
  colors = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"],
}) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={Array.isArray(data) ? data : []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="idade"
            stroke="#475569"
            label={{
              value: "Idade (dias)",
              fill: "#475569",
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            stroke="#475569"
            label={{
              value: "Peso (kg)",
              fill: "#475569",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #1e293b",
              borderRadius: "8px",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />

          {animals.map((animal, index) => {
            const color = colors[index % colors.length];
            const id = animal?.id;
            return (
              <Line
                key={id || index}
                type="monotone"
                dataKey={id ? `animal_${id}` : `animal_${index}`}
                name={animal?.brinco || `Animal ${index + 1}`}
                stroke={color}
                strokeWidth={3}
                connectNulls
                dot={(props) => (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    fill={color}
                    stroke={color}
                  />
                )}
                activeDot={{ r: 6 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
