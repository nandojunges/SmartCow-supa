// GrowthChart.jsx
import React, { useMemo } from "react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  Line,
  ComposedChart,
} from "recharts";

export default function GrowthChart({
  data = [],
  expectedData = null,
  metaPeso = null,
  showArea = true,
}) {
  const chartData = useMemo(() => {
    const real = Array.isArray(data) ? data : [];
    if (!real.length) return [];

    // Index esperado por idadeDias (se existir)
    const expectedByAge = new Map();
    if (Array.isArray(expectedData)) {
      expectedData.forEach((e, idx) => {
        const idade = Number(e?.idadeDias ?? e?.idade ?? idx);
        if (!Number.isNaN(idade)) expectedByAge.set(idade, e);
      });
    }

    return real.map((item, index) => {
      const idade = Number(item?.idadeDias ?? item?.idade ?? index);

      // tenta casar pelo idadeDias, senão cai no index
      const exp =
        (Number.isFinite(idade) && expectedByAge.get(idade)) ||
        (Array.isArray(expectedData) ? expectedData[index] : null);

      const esperadoRaw =
        exp && exp.peso != null ? Number(exp.peso) : Number(item?.esperado);

      const esperado = Number.isFinite(esperadoRaw) ? esperado : null;

      // mínimo/máximo: se vier no expectedData, usa; senão calcula em torno do esperado
      const minimoRaw =
        exp && exp.minimo != null
          ? Number(exp.minimo)
          : esperado != null
          ? esperado * 0.9
          : null;

      const maximoRaw =
        exp && exp.maximo != null
          ? Number(exp.maximo)
          : esperado != null
          ? esperado * 1.1
          : null;

      const minimo = Number.isFinite(minimoRaw) ? minimoRaw : null;
      const maximo = Number.isFinite(maximoRaw) ? maximoRaw : null;

      // ✅ Para fazer band entre min e max com stack:
      // - base = minimo (invisível)
      // - range = (max - min) (visível)
      const range =
        minimo != null && maximo != null ? Math.max(0, maximo - minimo) : null;

      return {
        ...item,
        idadeDias: Number.isFinite(idade) ? idade : index,
        peso: item?.peso != null ? Number(item.peso) : null,
        esperado,
        minimo,
        maximo,
        _minBase: minimo, // base invisível
        _range: range, // faixa visível
      };
    });
  }, [data, expectedData]);

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>

            {/* faixa min-max (verde leve) */}
            <linearGradient id="bandOk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.06} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="idadeDias"
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 12 }}
            label={{
              value: "Idade (dias)",
              fill: "#475569",
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: "#475569", fontSize: 12 }}
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
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)",
            }}
            itemStyle={{ color: "#e2e8f0" }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value, name) => {
              if (value == null) return ["—", name];
              const v = Number(value);
              const label =
                name === "peso"
                  ? "Peso Real"
                  : name === "esperado"
                  ? "Esperado"
                  : name === "minimo"
                  ? "Mínimo Aceitável"
                  : name === "maximo"
                  ? "Máximo Aceitável"
                  : name;
              return [`${Number.isFinite(v) ? v : value} kg`, label];
            }}
          />

          {/* ✅ Faixa entre mínimo e máximo (band correta) */}
          {showArea && (
            <>
              {/* base invisível */}
              <Area
                type="monotone"
                dataKey="_minBase"
                stackId="band"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
              />
              {/* faixa visível */}
              <Area
                type="monotone"
                dataKey="_range"
                stackId="band"
                stroke="none"
                fill="url(#bandOk)"
                isAnimationActive={false}
              />
            </>
          )}

          {/* Peso real */}
          <Line
            type="monotone"
            dataKey="peso"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ fill: "#06b6d4", r: 4, strokeWidth: 2, stroke: "#0f172a" }}
            activeDot={{ r: 6, fill: "#06b6d4", stroke: "#fff", strokeWidth: 2 }}
            connectNulls
          />

          {/* Esperado */}
          <Line
            type="monotone"
            dataKey="esperado"
            stroke="#64748b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls
          />

          {/* Meta */}
          {metaPeso != null && (
            <ReferenceLine
              y={Number(metaPeso)}
              stroke="#10b981"
              strokeDasharray="3 3"
              label={{
                value: "Meta",
                fill: "#10b981",
                fontSize: 12,
                position: "right",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
