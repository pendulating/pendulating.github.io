import { SITE } from "@config";
import type { PostEntry } from "../types/content";

const postFilter = ({ data }: Pick<PostEntry, "data">) => {
  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
};

export default postFilter;
