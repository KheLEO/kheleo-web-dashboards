"use client";
import { leaderboardPageSchema, type LeaderboardQuery } from "@/contracts/gti";
import { getApi } from "@/lib/api-client";
export const getLeaderboards = (query: LeaderboardQuery, signal?: AbortSignal) =>
  getApi("gti/leaderboards", leaderboardPageSchema, query, signal);
