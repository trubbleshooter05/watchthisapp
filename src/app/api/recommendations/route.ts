import { NextResponse } from "next/server";
import { getRecommendationApiPayload } from "@/lib/recommendation-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const movie = (searchParams.get("movie") || "").trim();

  if (!movie) {
    return NextResponse.json(
      {
        error: "missing_movie",
        message: "Provide a movie slug or title via ?movie=interstellar",
      },
      { status: 400 }
    );
  }

  const payload = getRecommendationApiPayload(movie);
  if (!payload) {
    return NextResponse.json(
      {
        error: "not_found",
        message: `No recommendation data found for movie: ${movie}`,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
