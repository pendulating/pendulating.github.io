import { slugifyStr } from "@utils/slugify";
import Datetime from "./Datetime";
import type { PostData } from "../types/content";

export interface Props {
  href?: string;
  frontmatter: PostData;
  secHeading?: boolean;
}

export default function Card({ href, frontmatter, secHeading = true }: Props) {
  const { title, pubDatetime, modDatetime, description } = frontmatter;

  const headerProps = {
    style: {},
    className: "text-lg font-medium decoration-dashed hover:scale-105 transition-transform duration-200",
  };

  return (
    <li className="my-6">
      <a
        href={href}
        className="inline-block text-lg font-medium text-skin-base decoration-dashed underline-offset-4 focus-visible:no-underline focus-visible:underline-offset-0 "
      >
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>
      <Datetime pubDatetime={pubDatetime} modDatetime={modDatetime} />
      <p>{description}</p>
    </li>
  );
}
