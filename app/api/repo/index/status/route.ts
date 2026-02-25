import { NextRequest, NextResponse } from "next/server";
import { jobStatusMap } from "@/lib/indexing";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
        return NextResponse.json({ error: "JOB_ID_REQUIRED", message: "Missing jobId query parameter." }, { status: 400 });
    }

    const status = jobStatusMap.get(jobId);

    if (!status) {
        return NextResponse.json({ error: "JOB_NOT_FOUND", message: "No job found with that ID.", status: "not_found" }, { status: 404 });
    }

    return NextResponse.json(status);
}
