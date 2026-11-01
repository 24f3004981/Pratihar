import type { Business, JobCard, Scenario, Version } from "@/lib/types";
import type { Run } from "@/lib/trial";

export type RunSummary = Omit<Run, "results"> & { results?: Run["results"] };
export type DeskData = {
  business: Business;
  gaps: string[];
  versions: (Version & { run: RunSummary | null })[];
  tests: Scenario[];
};
export type { JobCard, Run };
export type TabProps = { data: DeskData; reload: () => Promise<void>; go: (tab: string) => void };
