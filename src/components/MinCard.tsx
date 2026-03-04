import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { CollectionEntry } from "astro:content";
export interface Props {
  href?: string;
  frontmatter: CollectionEntry<"venue" | "title" | "tag" | "imgpath" | "description">["data"];
  secHeading?: boolean;
}

export default function MinCard({ href, frontmatter, secHeading = true }: Props) {
  const { venue, title, tag, description, imgpath } = frontmatter;

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "text-lg font-medium decoration-dashed hover:underline",
  };

  return (
    <li className="my-6">
      <div>
      <span style={{ fontStyle: "italic" }}>{venue}</span>{" "}
      <span style={{ fontWeight: "bold" }}>{tag}</span>
      <br />
    </div>
      <a
        href={href}
        className="inline-block text-lg font-medium text-skin-base decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0"
      >
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>


      <div className="flex justify-center">
        <img src={imgpath} alt={title} className="w-3/4 object-center object-cover p-4" />
      </div>

      <p>{description}</p>
    </li>
  );
}