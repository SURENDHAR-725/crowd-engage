import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Tooltip,
} from "recharts";
import type { ResponseAggregation } from "@/services/responseService";

interface LiveResultsGraphProps {
  data: ResponseAggregation[];
  type?: "bar" | "pie" | "horizontal";
  showCorrect?: boolean;
  animate?: boolean;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--spark-coral))",
  "hsl(var(--spark-teal))",
  "hsl(var(--spark-green))",
  "hsl(var(--amber-500, 217 91% 60%))",
  "hsl(var(--purple-500, 280 70% 60%))",
];

export const LiveResultsGraph = ({
  data,
  type = "bar",
  showCorrect = false,
  animate = true,
}: LiveResultsGraphProps) => {
  const [animatedData, setAnimatedData] = useState<ResponseAggregation[]>([]);

  useEffect(() => {
    if (animate) {
      // Animate data changes
      setAnimatedData(data);
    } else {
      setAnimatedData(data);
    }
  }, [data, animate]);

  const chartData = animatedData.map((item, index) => ({
    name: item.option_text,
    label: String.fromCharCode(65 + index),
    votes: item.vote_count,
    percentage: item.percentage,
    isCorrect: item.is_correct,
    fill: showCorrect && item.is_correct ? "hsl(var(--spark-green))" : COLORS[index % COLORS.length],
  }));

  const totalVotes = data.reduce((sum, item) => sum + item.vote_count, 0);

  if (type === "horizontal") {
    return (
      <div className="space-y-4">
        <AnimatePresence>
          {chartData.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: item.fill }}
                  >
                    {item.label}
                  </div>
                  <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                  {showCorrect && item.isCorrect && (
                    <span className="px-2 py-0.5 bg-spark-green/20 text-spark-green text-xs rounded-full">
                      Correct
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{item.votes} votes</span>
                  <span className="font-bold text-lg min-w-[50px] text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="text-center text-sm text-muted-foreground pt-2">
          Total responses: <span className="font-bold text-foreground">{totalVotes}</span>
        </div>
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="votes"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={50}
              paddingAngle={2}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value} votes`, name]}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span>{item.label}: {item.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default bar chart
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis
            type="category"
            dataKey="label"
            width={40}
            tick={{ fill: "hsl(var(--foreground))" }}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => [
              `${props.payload.votes} votes (${value}%)`,
              props.payload.name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="percentage" radius={[0, 8, 8, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="text-center text-sm text-muted-foreground">
        Total responses: <span className="font-bold text-foreground">{totalVotes}</span>
      </div>
    </div>
  );
};

export default LiveResultsGraph;
