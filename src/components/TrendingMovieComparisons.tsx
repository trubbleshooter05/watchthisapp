"use client";

import { useEffect, useState } from "react";

interface Keyword {
  keyword: string;
  volume?: number;
  trend: "rising" | "stable" | "declining";
  competition: "low" | "medium" | "high";
}

export function TrendingMovieComparisons() {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3001/api/insights/keywords?trending=true")
      .then((r) => r.json())
      .then((data) => {
        setKeywords(data.keywords || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading trending comparisons...</div>;
  if (keywords.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-black rounded-xl border border-purple-500/20 p-8 my-12">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">🔥</span> Trending Movie Comparisons
      </h2>
      <div className="space-y-3">
        {keywords.map((kw, i) => (
          <div key={i} className="group">
            <div className="flex items-start justify-between p-3 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition">
              <div>
                <p className="font-semibold text-white">{kw.keyword}</p>
                <p className="text-sm text-purple-300 mt-1">
                  {kw.volume && `${kw.volume} monthly searches`}
                </p>
              </div>
              <div className="text-xs font-medium">
                <span className={`px-2 py-1 rounded ${
                  kw.trend === "rising" ? "bg-green-500/20 text-green-300" :
                  kw.trend === "stable" ? "bg-blue-500/20 text-blue-300" :
                  "bg-gray-500/20 text-gray-300"
                }`}>
                  {kw.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-6">Real demand signals from your audience</p>
    </div>
  );
}
