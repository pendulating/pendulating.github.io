---
author: Matt Franchi
pubDatetime: 2025-01-15T12:00:00.000Z
modDatetime:
title: Sensing AI Incidents & Risks from Global News
slug: uair-brief
featured: false
draft: false
tags:
  - artificial intelligence
  - machine learning
  - research
  - risk assessment
  - news analysis
  - urban AI
description: An LLM-based Urban AI Risks (UAIR) assessment pipeline for extracting, verifying, and classifying risk information about AI use cases from large-scale news article collections. The pipeline processes articles through a five-stage workflow combining large language model inference, semantic verification, and regulatory classification.
bibliography: sample.bib
---

<div class="fullwidth">

<img src="Images/cornell-tech.png" style="width:4cm" alt="image" />
<img src="Images/nokia.png" style="width:4cm" alt="image" />

**

</div>

<div class="twothirdswidth">

</div>

# Introduction

<div class="fullwidth">

The development and deployment of Artificial Intelligence (AI)
technologies has become a globally-experienced phenomenon, although
perceptions and regulatory frameworks vary widely across jurisdictions.
As AI systems are increasingly deployed in urban environments—from
traffic management and public safety to healthcare and education—there
is a critical need for systematic monitoring and assessment of
AI-related risks and incidents reported in global news media.

This brief presents an Large Lanugage Model (LLM)-based Urban AI Risks
(UAIR) assessment pipeline, a comprehensive system for extracting,
verifying, and classifying risk information about AI use cases from
large-scale news article collections. The pipeline processes raw HTML
articles through a five-stage workflow that combines large language
model (LLM) inference, semantic verification, and regulatory
classification to produce structured datasets suitable for policy
analysis and risk assessment.

## Core Technologies

The UAIR pipeline leverages three foundational technologies that enable
its scalable, configuration-driven architecture:

**Hydra:** Hydra is a framework for elegantly configuring complex
applications, developed by Facebook Research. It provides hierarchical
configuration management through YAML files and Python dataclasses,
enabling composition, inheritance, and runtime overrides without code
changes. Hydra’s key features include config groups (modular, reusable
configuration components), variable interpolation (supporting
environment variables, config references, and computed values), and
command-line overrides (allowing any configuration parameter to be
modified at runtime). In UAIR, Hydra orchestrates the entire pipeline by
managing stage configurations, model parameters, prompt templates, and
SLURM launcher settings. Pipeline definitions are specified as YAML
files that compose base configurations with stage-specific overrides,
enabling experimentation and production deployments from the same
codebase. The CLI entry point uses Hydra’s `@hydra.main` decorator to
load configurations, resolve dependencies, and execute the pipeline DAG.

**Ray Data:** Ray is an AI compute engine consisting of a core
distributed runtime and specialized libraries for accelerating ML
workloads. Ray Data provides scalable, framework-agnostic data loading
and transformation for ML workloads, facilitating distributed data
processing across training, tuning, and prediction tasks. Key
capabilities include lazy evaluation (operations are not executed until
results are materialized), automatic parallelization (distributing
operations across available CPUs), streaming I/O (processing datasets
larger than available RAM), and fault tolerance (configurable error
handling and retry logic). In UAIR, Ray Data enables memory-efficient
processing of large article collections by automatically parallelizing
operations like text extraction, batch inference, and result
aggregation. The system uses Ray Datasets for distributed processing,
with automatic conversion to pandas DataFrames for smaller datasets or
when streaming is disabled. Ray initialization is SLURM-aware,
automatically detecting CPU allocations and configuring the runtime
accordingly.

**vLLM:** vLLM is a high-throughput and memory-efficient inference
engine for large language models, designed to accelerate LLM serving
with features like PagedAttention (efficient memory management for KV
caches), continuous batching (dynamically batching requests as they
arrive), and various quantization methods. vLLM achieves 2–4x higher
throughput than traditional batching approaches while maintaining low
latency. Key optimizations include prefix caching (reusing KV cache for
repeated prompt prefixes), chunked prefill (reducing memory
fragmentation for long contexts), and tensor parallelism (distributing
model layers across multiple GPUs). In UAIR, vLLM powers all LLM
inference stages (classification, decomposition, EU Act classification,
risks/benefits assessment) through Ray Data’s LLM processor integration.
The system configures vLLM engines with stage-specific parameters
(context length, batch size, memory utilization) and uses guided
decoding for structured outputs, ensuring schema compliance without
post-processing. vLLM’s continuous batching keeps GPU utilization high
even with variable-length inputs, critical for processing heterogeneous
article collections.

**Qwen3-30B-A3B:** Qwen3-30B-A3B is a 30-billion parameter
Mixture-of-Experts (MoE) language model developed by Alibaba Group, part
of the Qwen3 series of advanced large language models. The model employs
a sparse MoE architecture that activates approximately 3 billion
parameters per inference (A3B denotes “3B active”) out of 30.5 billion
total parameters, enabling capabilities comparable to larger dense
models while maintaining computational efficiency. Key capabilities
include advanced reasoning and instruction following, multilingual
understanding across 119 languages and dialects, extended context
handling (up to 128,000 tokens, though UAIR configures 16,384–20,480
tokens per stage), and strong performance on complex tasks requiring
structured output generation. The model supports both “thinking” and
“non-thinking” modes, with the thinking mode enabling explicit reasoning
processes for complex problem-solving. In UAIR, Qwen3-30B-A3B-Instruct
serves as the primary LLM for all inference stages, configured via vLLM
with GPU memory utilization of 0.9, chunked prefill enabled for long
contexts, prefix caching for repeated prompts, and tensor parallelism
matching available GPUs (typically 2–4 GPUs). The model’s combination of
reasoning capabilities, multilingual support, and efficient MoE
architecture makes it well-suited for extracting structured information
from diverse news sources and performing regulatory classification tasks
across different languages and domains.

**Weights & Biases:** Weights & Biases (W&B) is a comprehensive platform
for tracking and visualizing machine learning experiments, datasets, and
models, designed to help teams build better models faster through
systematic experiment management. W&B provides experiment tracking
capabilities including metrics logging (loss, accuracy, custom metrics),
hyperparameter tracking, system monitoring (CPU/GPU utilization, memory
usage, network activity), artifact management (dataset and model
versioning), and collaborative features (run comparison, visualization
dashboards, team workspaces). The platform supports both online mode
(real-time syncing to cloud) and offline mode (deferred syncing for
environments with limited network access). Key features include run
grouping (organizing related experiments), run comparison (comparing
metrics across runs), custom visualizations (plotting metrics over
time), and artifact versioning (tracking datasets and models across
experiments). In UAIR, W&B integration provides centralized experiment
tracking across all pipeline stages, with each stage creating a separate
run grouped under the same pipeline execution. The system logs token
usage (prompt, output, total), latency metrics (per-article and
batch-level), stage-specific statistics (relevance rates, verification
success rates), and compute metadata (CPU count, GPU count, model
paths). Tables are logged with configurable sampling to enable result
inspection without overwhelming the interface. The integration uses
in-process mode (service daemon disabled) for compatibility with SLURM
and Ray distributed environments, ensuring reliable logging in cluster
computing scenarios.

## System Architecture

The UAIR pipeline integrates these technologies into a
configuration-driven architecture designed to scale from small test runs
(hundreds of articles) to production-scale processing of millions of
articles across SLURM-managed GPU clusters.

The pipeline operates as a directed acyclic graph (DAG) where each stage
is independently configurable and can be executed in parallel when
dependencies permit. Hydra manages the DAG structure, resolving
dependencies through topological sorting and coordinating stage
execution via SLURM job submission or local execution. Ray Data handles
distributed data processing, automatically parallelizing operations and
managing memory through lazy evaluation and streaming I/O. vLLM provides
efficient batched LLM inference, with engines configured per-stage to
optimize throughput and memory usage.

All intermediate results are persisted as Parquet files, enabling
partial pipeline execution, result inspection, and incremental
processing. The system integrates with Weights & Biases for experiment
tracking, providing real-time monitoring of token usage, latency, and
output statistics across all stages.

## Key Capabilities

The pipeline addresses several critical challenges in large-scale AI
risk monitoring:

**Relevance Filtering:** Efficiently identifies AI-relevant articles
from heterogeneous news sources using LLM-based classification with
optional keyword pre-filtering to reduce computational costs. The binary
classification (YES/NO) uses guided decoding to ensure deterministic
outputs.

**Structured Extraction:** Decomposes articles into standardized tuples
capturing deployment context, actors, locations, and impacts using
guided decoding to ensure schema compliance. The 13-field schema
includes deployment characteristics (domain, purpose, capability,
space), actor identities (deployer, subject, developer), geographic and
temporal information, and impact lists (harms, risks, benefits). Missing
information is explicitly tracked rather than filled with placeholders.

**Claim Verification:** Validates extracted tuples against source text
using a combination of semantic similarity (embedding-based) and natural
language inference (NLI) models to ensure factual accuracy. The “combo”
verification method combines cosine similarity scores, entailment
probabilities, and contradiction detection with configurable thresholds.

**Regulatory Classification:** Maps AI deployments to EU AI Act risk
categories (Prohibited, High Risk, Limited/Low Risk) with explicit
citations to regulatory text and amendments. The classification process
follows a four-step methodology ensuring strict reasoning verification
and amendment awareness, with vague articles explicitly flagged to
prevent misclassification.

**Impact Assessment:** Extracts detailed risk and benefit analyses
including human rights impacts (aligned with UDHR) and Sustainable
Development Goal (SDG) assessments. The structured output includes
nested assessments for all 30 UDHR articles, SDG targets, and PESTLE
categories, providing comprehensive impact analysis suitable for policy
evaluation.

</div>

# Data

<div class="fullwidth">

## Dataset Overview

The UAIR dataset combines news articles from the United States and a
global subset, totaling over 415,000 articles across 49 countries.
Figure <a href="#fig:world_map_articles" data-reference-type="ref"
data-reference="fig:world_map_articles">1</a> visualizes the geographic
distribution of articles, with countries colored by article count using
a yellow-orange-red colormap. Countries with no articles are shown in
gray.

<figure id="fig:world_map_articles" data-latex-placement="htbp">
<embed src="figures/world_map_articles_count.pdf" />
<figcaption>Geographic distribution of articles in the UAIR dataset.
Countries are colored by article count (yellow to red), with countries
containing no articles shown in gray. The dataset includes 415,821 total
articles across 49 countries.</figcaption>
</figure>

Table <a href="#tab:country_article_counts_all" data-reference-type="ref"
data-reference="tab:country_article_counts_all">[tab:country_article_counts_all]</a>
presents the top 20 countries by article count. The United States
dominates the dataset with 29,372 articles (7.1% of total), followed by
Morocco (11,617 articles), Thailand (10,867 articles), and Italy (10,583
articles). The dataset exhibits significant geographic diversity, with
representation across all major continents, though coverage is
concentrated in North America, Europe, and select regions in Africa,
Asia, and South America.

<div class="table*">

<table>
<thead>
<tr>
<th colspan="3" style="text-align: center;"><strong>Top 25
Countries</strong></th>
<th colspan="3" style="text-align: center;"><strong>Bottom 24
Countries</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align: left;"><span>1-3</span> (lr)<span>4-6</span>
Country</td>
<td style="text-align: center;">ISO</td>
<td style="text-align: center;">Count</td>
<td style="text-align: left;">Country</td>
<td style="text-align: center;">ISO</td>
<td style="text-align: center;">Count</td>
</tr>
<tr>
<td style="text-align: left;">United States of America</td>
<td style="text-align: center;">US</td>
<td style="text-align: center;">29,372</td>
<td style="text-align: left;">Luxembourg</td>
<td style="text-align: center;">LU</td>
<td style="text-align: center;">7,488</td>
</tr>
<tr>
<td style="text-align: left;">Morocco</td>
<td style="text-align: center;">MA</td>
<td style="text-align: center;">11,617</td>
<td style="text-align: left;">Romania</td>
<td style="text-align: center;">RO</td>
<td style="text-align: center;">7,390</td>
</tr>
<tr>
<td style="text-align: left;">Thailand</td>
<td style="text-align: center;">TH</td>
<td style="text-align: center;">10,867</td>
<td style="text-align: left;">Poland</td>
<td style="text-align: center;">PL</td>
<td style="text-align: center;">7,315</td>
</tr>
<tr>
<td style="text-align: left;">Italy</td>
<td style="text-align: center;">IT</td>
<td style="text-align: center;">10,583</td>
<td style="text-align: left;">Vietnam</td>
<td style="text-align: center;">VN</td>
<td style="text-align: center;">7,290</td>
</tr>
<tr>
<td style="text-align: left;">Czechia</td>
<td style="text-align: center;">CZ</td>
<td style="text-align: center;">10,563</td>
<td style="text-align: left;">Turkey</td>
<td style="text-align: center;">TR</td>
<td style="text-align: center;">7,038</td>
</tr>
<tr>
<td style="text-align: left;">Ghana</td>
<td style="text-align: center;">GH</td>
<td style="text-align: center;">10,518</td>
<td style="text-align: left;">Latvia</td>
<td style="text-align: center;">LV</td>
<td style="text-align: center;">7,018</td>
</tr>
<tr>
<td style="text-align: left;">Finland</td>
<td style="text-align: center;">FI</td>
<td style="text-align: center;">10,241</td>
<td style="text-align: left;">Portugal</td>
<td style="text-align: center;">PT</td>
<td style="text-align: center;">6,915</td>
</tr>
<tr>
<td style="text-align: left;">Colombia</td>
<td style="text-align: center;">CO</td>
<td style="text-align: center;">9,808</td>
<td style="text-align: left;">New Zealand</td>
<td style="text-align: center;">NZ</td>
<td style="text-align: center;">6,626</td>
</tr>
<tr>
<td style="text-align: left;">Uruguay</td>
<td style="text-align: center;">UY</td>
<td style="text-align: center;">9,632</td>
<td style="text-align: left;">Austria</td>
<td style="text-align: center;">AT</td>
<td style="text-align: center;">6,307</td>
</tr>
<tr>
<td style="text-align: left;">Serbia</td>
<td style="text-align: center;">RS</td>
<td style="text-align: center;">9,210</td>
<td style="text-align: left;">Estonia</td>
<td style="text-align: center;">EE</td>
<td style="text-align: center;">6,068</td>
</tr>
<tr>
<td style="text-align: left;">Canada</td>
<td style="text-align: center;">CA</td>
<td style="text-align: center;">9,180</td>
<td style="text-align: left;">Denmark</td>
<td style="text-align: center;">DK</td>
<td style="text-align: center;">5,878</td>
</tr>
<tr>
<td style="text-align: left;">Netherlands</td>
<td style="text-align: center;">NL</td>
<td style="text-align: center;">9,007</td>
<td style="text-align: left;">Hungary</td>
<td style="text-align: center;">HU</td>
<td style="text-align: center;">5,538</td>
</tr>
<tr>
<td style="text-align: left;">Malaysia</td>
<td style="text-align: center;">MY</td>
<td style="text-align: center;">8,986</td>
<td style="text-align: left;">Iran</td>
<td style="text-align: center;">IR</td>
<td style="text-align: center;">5,483</td>
</tr>
<tr>
<td style="text-align: left;">Spain</td>
<td style="text-align: center;">ES</td>
<td style="text-align: center;">8,713</td>
<td style="text-align: left;">Bulgaria</td>
<td style="text-align: center;">BG</td>
<td style="text-align: center;">5,079</td>
</tr>
<tr>
<td style="text-align: left;">Trinidad and Tobago</td>
<td style="text-align: center;">TT</td>
<td style="text-align: center;">8,509</td>
<td style="text-align: left;">Slovenia</td>
<td style="text-align: center;">SI</td>
<td style="text-align: center;">4,614</td>
</tr>
<tr>
<td style="text-align: left;">Argentina</td>
<td style="text-align: center;">AR</td>
<td style="text-align: center;">8,457</td>
<td style="text-align: left;">Ethiopia</td>
<td style="text-align: center;">ET</td>
<td style="text-align: center;">4,470</td>
</tr>
<tr>
<td style="text-align: left;">El Salvador</td>
<td style="text-align: center;">SV</td>
<td style="text-align: center;">8,317</td>
<td style="text-align: left;">Venezuela</td>
<td style="text-align: center;">VE</td>
<td style="text-align: center;">3,406</td>
</tr>
<tr>
<td style="text-align: left;">Ireland</td>
<td style="text-align: center;">IE</td>
<td style="text-align: center;">8,252</td>
<td style="text-align: left;">Bangladesh</td>
<td style="text-align: center;">BD</td>
<td style="text-align: center;">3,307</td>
</tr>
<tr>
<td style="text-align: left;">Australia</td>
<td style="text-align: center;">AU</td>
<td style="text-align: center;">8,231</td>
<td style="text-align: left;">Switzerland</td>
<td style="text-align: center;">CH</td>
<td style="text-align: center;">3,188</td>
</tr>
<tr>
<td style="text-align: left;">Belgium</td>
<td style="text-align: center;">BE</td>
<td style="text-align: center;">8,060</td>
<td style="text-align: left;">Tanzania</td>
<td style="text-align: center;">TZ</td>
<td style="text-align: center;">3,054</td>
</tr>
<tr>
<td style="text-align: left;">Chile</td>
<td style="text-align: center;">CL</td>
<td style="text-align: center;">7,783</td>
<td style="text-align: left;">Peru</td>
<td style="text-align: center;">PE</td>
<td style="text-align: center;">2,686</td>
</tr>
<tr>
<td style="text-align: left;">Israel</td>
<td style="text-align: center;">IL</td>
<td style="text-align: center;">7,782</td>
<td style="text-align: left;">Croatia</td>
<td style="text-align: center;">HR</td>
<td style="text-align: center;">2,437</td>
</tr>
<tr>
<td style="text-align: left;">Sweden</td>
<td style="text-align: center;">SE</td>
<td style="text-align: center;">7,589</td>
<td style="text-align: left;">South Korea</td>
<td style="text-align: center;">KR</td>
<td style="text-align: center;">2,112</td>
</tr>
<tr>
<td style="text-align: left;">Lithuania</td>
<td style="text-align: center;">LT</td>
<td style="text-align: center;">7,576</td>
<td style="text-align: left;">Saudi Arabia</td>
<td style="text-align: center;">SA</td>
<td style="text-align: center;">1,197</td>
</tr>
<tr>
<td style="text-align: left;">Greece</td>
<td style="text-align: center;">GR</td>
<td style="text-align: center;">7,570</td>
<td style="text-align: left;"></td>
<td style="text-align: center;"></td>
<td style="text-align: center;"></td>
</tr>
</tbody>
</table>

</div>

## Data Collection and Preprocessing

The UAIR pipeline processes news articles collected from diverse sources
and stored as HTML files. The preprocessing pipeline converts raw HTML
into clean text suitable for LLM processing through a multi-stage
workflow.

### Article Aggregation

Articles are initially collected as individual text files organized by
year and country. The aggregation script (`us_agg.py`) scans directory
structures using glob patterns to discover all article files, extracts
metadata (country, year from directory structure), and loads article
text content. The script uses pandas with progress bars (tqdm) for
efficient parallel processing, storing results in Parquet format with
optimized row group sizes (500 rows per group) to balance file size and
parallel processing efficiency.

The aggregation produces two outputs: (1) `all_articles_meta.parquet`
containing metadata (article_path, country, year) without text content,
and (2) `all_articles.parquet` containing full article text. Row group
sizing is optimized for Ray Data processing, targeting approximately
250–500MB compressed per group to enable efficient parallelization.

### HTML to Text Extraction

Raw HTML articles are converted to clean text using the Trafilatura
library (`extract_text_trafilatura.py`), a specialized tool designed for
extracting main content from web pages while filtering out navigation,
advertisements, and other boilerplate. The extraction process uses the
following configuration:

- `include_comments: false` — Excludes HTML comments

- `include_tables: false` — Excludes table content (can slow processing)

- `include_images: false` — Excludes image alt text

- `include_links: false` — Excludes link text

- `include_formatting: false` — Excludes formatting information

- `deduplicate: true` — Removes duplicate text blocks

- `output_format: "txt"` — Plain text output

The extraction function handles edge cases including empty or invalid
HTML, extraction failures (Trafilatura returns None on failure), and
very short content. Failed extractions are logged with warnings, and the
original HTML length is preserved for comparison statistics. The script
processes articles in batch with progress tracking, replacing the
`article_text` column with extracted text to avoid storing both HTML and
text (reducing file size by approximately 60–80%).

### Data Format and Schema

All pipeline stages operate on Parquet-formatted datasets with
standardized schemas. The base article schema includes:

- `article_id` — Unique identifier (SHA-1 hash of article path or text
  if path unavailable)

- `article_text` — Clean extracted text content

- `article_path` — Source file path

- `country` — Country code (e.g., "us")

- `year` — Publication year extracted from directory structure

Downstream stages extend this schema with stage-specific fields. For
example, the classification stage adds `is_relevant` (boolean),
`relevance_score` (float), and `classification_mode` (string). The
decomposition stage adds 13 tuple fields, and verification stages add
similarity scores and verification flags.

## Data Processing Modes

The pipeline supports two data processing modes optimized for different
scales:

**Pandas Mode:** For small to medium datasets (up to approximately 100k
articles), data is loaded entirely into memory as pandas DataFrames.
This mode provides fast iteration and debugging but is memory-limited.

**Ray Data Mode:** For large-scale processing, data flows through Ray
Datasets with lazy evaluation and distributed processing. Ray Data
automatically parallelizes operations across available CPUs, supports
streaming I/O for memory efficiency, and can process datasets larger
than available RAM. The system detects dataset size and automatically
selects the appropriate mode, with manual override available via
configuration.

## Data Flow and Artifact Management

The orchestrator maintains an internal artifact registry that maps
logical names to file paths, enabling stages to reference outputs from
previous stages using dot notation (e.g., `classify.relevant` resolves
to the path of relevant articles from the classification stage). This
abstraction allows pipeline reconfiguration without modifying stage
code.

**Registry Resolution:** The registry resolves references in three
stages: (1) sources are registered at pipeline start from
`pipeline.sources` configuration, (2) stage outputs are registered after
successful stage execution using output specifications, and (3)
downstream stages resolve inputs by looking up registered names.
Multi-output stages (e.g., `classify.all` and `classify.relevant`)
enable selective consumption of outputs by downstream stages.

**Output Persistence:** All intermediate outputs are persisted as
Parquet files with descriptive paths following the pattern
`outputs/STAGE_NAME/FILENAME.parquet`. Paths are resolved relative to
`pipeline.output_root`, which defaults to
`${hydra:run.dir}/PIPELINE_NAME`. This organization enables easy
navigation of pipeline outputs and supports result inspection without
re-execution.

**Partial Execution:** The system supports partial pipeline execution
through the `allow_partial` configuration flag. When enabled, stages can
be skipped if their outputs already exist (checked via file existence).
This enables incremental processing, result inspection, and debugging
without full re-execution. The manifest file (`manifest.json`) tracks
execution status and metadata for each stage.

**Schema Evolution:** Parquet’s schema evolution capabilities enable
adding columns in downstream stages without breaking compatibility.
However, the pipeline maintains explicit schemas per stage to ensure
data quality. Schema validation occurs at stage boundaries, with errors
logged to W&B for monitoring.

</div>

# Methods

<div class="fullwidth">

Our pipeline processes large-scale news articles through a five-stage
workflow designed to extract, verify, and classify urban AI risk
information. The system is implemented as a configuration-driven
pipeline using Hydra for orchestration, Ray Data for distributed
processing, and vLLM for efficient large language model inference.

## Pipeline Architecture

The full event pipeline processes articles through the following stages:
(1) relevance classification, (2) tuple decomposition, (3) tuple
verification, (4) EU AI Act classification, and (5) risks and benefits
classification. Each stage operates on Parquet-formatted datasets and
can be executed independently or as part of the complete workflow.

## Stage 1: Relevance Classification

The first stage filters articles for relevance to AI risks using large
language model (LLM) classification. Articles are processed in batches
through a vLLM inference engine, with each article classified as
relevant or not relevant based on its content. The stage supports
optional keyword-based pre-filtering to reduce computational costs by
gating articles before LLM processing.

**Prompt Design:** The classification uses a binary relevance prompt
with a system message identifying the model as a “careful news analyst
trained to decide if a news article is related to artificial
intelligence (AI) in any substantive way.” The user template presents
article text (optionally chunked for long articles) and requests a
strict YES/NO response. The prompt includes article metadata
(article_id, chunk identifiers) to aid in tracking and debugging.

**Keyword Pre-filtering:** To reduce LLM processing costs, the stage
supports keyword-based buffering with configurable modes: `pre_gating`
(filter before LLM), `post_gating` (compute flag only), or `off` (no
filtering). The keyword regex matches AI-related terms including
“artificial intelligence,” “machine learning,” “neural network,” “large
language model,” and common model names (GPT, Claude, Gemini, etc.).

**Guided Decoding:** Classification uses guided decoding with a choice
constraint limiting outputs to “YES” or “NO,” ensuring deterministic
binary classification without post-processing. This eliminates parsing
errors and ensures consistent output format.

**Configuration Parameters:** Batch size is typically 16 articles per
batch, GPU memory utilization 0.8, and maximum model context length
8,192 tokens. The stage outputs two datasets: all articles with
relevance scores, and a filtered set containing only relevant articles.
On the US dataset, this filtered set contains 578 articles (1.97% of
29,372 input articles) for downstream processing.

## Stage 2: Tuple Decomposition

Relevant articles are decomposed into structured tuples using LLM-based
information extraction. The decomposition extracts 13 core fields:
deployment domain, deployment purpose, deployment capability, identity
of AI deployer, identity of AI subject, identity of AI developer,
location of AI deployer, location of AI subject, date and time of event,
deployment space (publicly accessible or not), list of harms that
occurred, list of risks that occurred, and list of benefits that
occurred.

**Prompt Design:** The decomposition prompt instructs the model to act
as an “expert artificial intelligence safety researcher trained in
extracting and summarizing urban AI risks from news articles.” The
prompt emphasizes focusing on the original intended AI use (even if
misused) and requires action verbs describing how the technology is
used. Each field must be output in less than 7 words, with specificity
at a general level rather than concrete instances. Fields not specified
in the article are explicitly listed under “missing” rather than filled
with placeholders.

**Schema Enforcement:** The extraction uses guided decoding with a JSON
schema generated from a Pydantic model. The schema defines field types
(strings, enums, arrays) and required fields. Schema references (`$ref`)
are inlined for xgrammar compatibility. The guided decoding
configuration enforces strict schema compliance
(`disable_fallback: true`, `disable_additional_properties: true`),
ensuring outputs conform to the expected structure without
post-processing.

**Model Configuration:** The LLM is configured with a larger context
window (20,480 tokens) to accommodate full article text, with batch size
reduced to 4 articles per batch to manage memory constraints. GPU memory
utilization is set to 0.9 to maximize throughput while maintaining
stability. The stage uses temperature 0 for deterministic extraction.

## Stage 3: Tuple Verification

Extracted tuples are verified against the source article text using a
combination of semantic similarity and natural language inference (NLI).
The verification stage uses two models: an embedding model
(intfloat/e5-base) for semantic similarity matching and an NLI model
(mdeberta-v3-base-xnli-multilingual) for contradiction detection.

The verification method employs a “combo” approach that combines
similarity scores, entailment probabilities, and contradiction
detection. Thresholds are set at similarity $`\geq 0.55`$, entailment
$`\geq 0.85`$, and contradiction $`\leq 0.05`$. The system identifies
the top-k most relevant text spans (typically $`k=5`$) from the article
for each tuple field and verifies claims against these spans. A core
tuple is considered verified if its key fields (domain, purpose,
capability, deployer, subject) meet the verification thresholds. On the
US dataset, 61 of 578 decomposed articles (10.5%) pass core tuple
verification.

## Stage 4: EU AI Act Classification

Verified tuples are classified according to the EU AI Act risk
categories: Prohibited, High Risk, or Limited/Low Risk. The
classification stage uses LLM inference with a specialized prompt that
includes relevant portions of the EU AI Act and its amendments.

**Prompt Design:** The system prompt identifies the model as an
“experienced regulatory compliance specialist who works in the field of
artificial intelligence (AI) technology regulation” with access to the
full EU AI Act and amendments. The user template implements a four-step
classification process: (1) writing a brief description starting with
“The usage of AI is...” in language similar to the Act, (2) determining
Prohibited or High Risk status with exact text citations and strict
reasoning verification, (3) checking amendments for classification
changes with explicit amendment references, and (4) classifying as
Limited/Low Risk if neither Prohibited nor High Risk. The prompt
emphasizes attention to subject and user identity, purpose, and
capability, as these are critical for risk classification.

**Vague Article Filtering:** Before LLM processing, articles are checked
for vagueness using keyword-based heuristics. Articles flagged as “too
vague to process” are excluded from classification and marked with
`too_vague_to_process = True`. This prevents misclassification of
articles lacking sufficient detail for regulatory assessment. On the US
dataset, 17 of 61 verified articles (27.9%) are flagged as too vague to
process.

**Guided Decoding Schema:** The classification uses guided decoding with
a JSON schema defining the expected output structure: `eu_ai_label`
(enum: Prohibited, High Risk, Limited or Low Risk), `eu_ai_desc`
(string), `eu_ai_relevant_text` (string with Act citations),
`eu_ai_reason` (string with detailed reasoning), and optional amendment
references.

**Input Gating:** The classification is gated to only process tuples
where `core_tuple_verified = True`, ensuring that classifications are
based on reliable extractions. Deduplication by `article_id` ensures one
classification per article. The stage uses a context window of 16,384
tokens and temperature 0 for deterministic outputs.

## Stage 5: Risks and Benefits Classification

The final stage extracts detailed risk and benefit assessments,
including impacts on human rights and Sustainable Development Goals
(SDGs). The classification produces structured JSON output containing: a
description of the risks and benefits, an assessment of impact on human
rights (aligned with the Universal Declaration of Human Rights), an
assessment of impact on SDGs, and additional impacts (PESTLE analysis).

**Prompt Design:** The system prompt identifies the model as a “renowned
specialist in the field of AI technology with a dedicated focus on
understanding, promoting, and supporting Universal Human Rights,” with
comprehensive knowledge of all 30 articles from the UN Universal
Declaration of Human Rights. The user template implements a six-step
assessment process: (1) describing the AI system in language parallel to
UDHR/SDG phrasing, (2) evaluating each human right with
Positive/Negative/Mixed classification, (3) assessing SDG impacts, (4)
identifying additional risks, (5) providing overall risk-benefit
summary, and (6) generating structured output.

**Complex Schema:** The guided decoding schema includes nested
structures for human rights assessments (array of objects with right
name, impact classification, and reasoning), SDG assessments (array of
objects with goal number, target, impact, and reasoning), and additional
impacts (PESTLE categories: Political, Economic, Social, Technological,
Legal, Environmental). The schema is significantly more complex than
other stages, requiring careful schema design and larger output token
limits (4,096 tokens).

**Serialization:** Nested JSON structures are serialized as JSON strings
for Parquet compatibility. The `rb_human_rights`, `rb_sdgs`, and
`rb_additional` fields store complete nested structures as strings,
while `rb_raw_json` preserves the full structured output. This approach
maintains schema compatibility while preserving complex hierarchical
data for downstream analysis.

This stage operates on verified tuples and uses a context window of
16,384 tokens to accommodate comprehensive prompt templates covering all
UDHR articles and SDG targets. Temperature is set to 0 for deterministic
outputs.

## Pipeline Outputs and Data Products

The UAIR pipeline produces structured datasets at each stage, enabling
both end-to-end analysis and stage-specific inspection. All outputs are
persisted as Parquet files with standardized schemas, facilitating
integration with downstream analysis tools.

### Stage 1: Classification Outputs

The relevance classification stage produces two outputs:

**classify_all.parquet:** Contains all input articles with
classification results. Schema includes `article_id`, `article_text`,
`is_relevant` (boolean), `relevance_answer` (raw LLM response:
"YES"/"NO"), `classification_mode` (heuristic or llm_relevance),
`latency_s` (processing time), and token usage fields
(`token_usage_prompt`, `token_usage_output`, `token_usage_total`).

**classify_relevant.parquet:** Filtered subset containing only articles
where `is_relevant = True`. On the US dataset, this represents 578
articles (1.97% of 29,372 input articles). This dataset serves as input
to downstream stages.

### Stage 2: Decomposition Outputs

The decomposition stage produces `tuples.parquet` with 13 core
extraction fields plus metadata. Each row represents one article
decomposed into structured tuples. Key fields include:

- `deployment_domain` — Categorical field (e.g., "Healthcare",
  "Transportation")

- `deployment_purpose` — Free-text description of AI use purpose

- `deployment_capability` — Technical capability description

- `identity_of_ai_deployer` — Organization/entity deploying AI

- `identity_of_ai_subject` — Individuals/groups affected by AI

- `identity_of_ai_developer` — Organization developing the AI system

- `location_of_ai_deployer` — Geographic location

- `location_of_ai_subject` — Geographic location of subjects

- `date_and_time_of_event` — Temporal information

- `deployment_space` — Enum: "Publicly accessible space" or "Not
  publicly accessible space"

- `list_of_harms_that_occurred` — JSON array of harm descriptions

- `list_of_risks_that_occurred` — JSON array of risk descriptions

- `list_of_benefits_that_occurred` — JSON array of benefit descriptions

- `missing` — JSON array of fields that were not found in the article

All list fields are serialized as JSON strings for Parquet
compatibility. The `missing` field explicitly tracks information gaps,
avoiding placeholder values that could be mistaken for actual data.

### Stage 3: Verification Outputs

The verification stage produces two outputs:

**verify_nbl_results.parquet:** Contains verification scores and flags
for each tuple field. Schema includes similarity scores (`sim_score`),
entailment probabilities (`ent_prob`), contradiction probabilities
(`contra_prob`), and verification flags (`verified`,
`core_tuple_verified`). The `core_tuple_verified` flag indicates whether
key fields (domain, purpose, capability, deployer, subject) meet
verification thresholds.

**docs_verification.parquet:** Contains the original decomposition
outputs merged with verification results, enabling analysis of
verification patterns across different tuple types.

### Stage 4: EU AI Act Classification Outputs

The EU AI Act classification produces
`classify_eu_ai_act_results.parquet` with the following schema:

- `eu_ai_label` — Risk category: "Prohibited", "High Risk", or "Limited
  or Low Risk"

- `eu_ai_desc` — Brief description in language similar to the Act

- `eu_ai_relevant_text` — Excerpted text from the Act supporting
  classification

- `eu_ai_reason` — Detailed reasoning for classification

- `eu_ai_raw_json` — Complete structured output as JSON string

- `too_vague_to_process` — Boolean flag for articles that could not be
  classified

- `eu_valid_input_count` — Number of valid inputs processed

Only tuples with `core_tuple_verified = True` are processed, ensuring
classifications are based on reliable extractions.

### Stage 5: Risks and Benefits Outputs

The risks and benefits classification produces
`classify_risk_benefits_results.parquet` with nested JSON structures:

- `rb_desc` — Description of risks and benefits

- `rb_human_rights` — JSON string containing UDHR impact assessment

- `rb_sdgs` — JSON string containing SDG impact assessment

- `rb_additional` — JSON string containing PESTLE analysis

- `rb_raw_json` — Complete structured output as JSON string

Nested structures are serialized as JSON strings to maintain Parquet
schema compatibility while preserving complex hierarchical data.

## Distributed Processing with Ray

The pipeline leverages Ray Data for distributed, memory-efficient
processing of large datasets. Ray initialization is SLURM-aware,
automatically detecting CPU allocations from environment variables
(`SLURM_CPUS_PER_TASK` or `SLURM_CPUS_ON_NODE`) and configuring the Ray
runtime accordingly.

Ray Data context is configured with CPU limits matching SLURM
allocations to prevent over-subscription. The object store memory is set
to 90% of job memory allocation (default 64GB, configurable via
`runtime.job_memory_gb`), enabling efficient data sharing between Ray
tasks. Progress bars are disabled by default in SLURM environments to
reduce logging noise, and the maximum errored blocks is configurable to
control fault tolerance.

Ray Datasets support lazy evaluation—operations are not executed until
results are materialized (e.g., via `to_pandas()` or writing to
Parquet). This enables optimization of operation chains and
memory-efficient processing of datasets larger than available RAM. The
system automatically selects between pandas and Ray Data modes based on
dataset size and configuration.

## vLLM Inference Engine

Model inference is handled by vLLM, a high-performance LLM serving
framework optimized for batched generation. The vLLM engine is
configured with the following key parameters:

**Memory Management:** GPU memory utilization is set per-stage
(typically 0.8–0.9) to balance throughput and stability. The engine uses
continuous batching with configurable maximum sequences per batch
(typically 4–8 depending on context length). Chunked prefill is enabled
for long contexts to reduce memory fragmentation.

**Model Configuration:** The default model is Qwen3-30B-Instruct,
configured with tensor parallelism matching available GPUs
(auto-detected from `CUDA_VISIBLE_DEVICES`). Context length is
stage-specific: 8,192 tokens for classification, 20,480 for
decomposition, and 16,384 for EU Act and risks/benefits classification.

**Performance Optimizations:** Prefix caching is enabled to improve
throughput for repeated prompts (e.g., system prompts). The v2 block
manager is used for better memory efficiency. KV cache dtype is
auto-selected (fp8 when supported) to reduce memory usage. CUDA graphs
are disabled by default (`enforce_eager: true`) for stability, though
they can be enabled for production runs.

**Guided Decoding:** Structured outputs use vLLM’s guided decoding with
JSON schema constraints. The system uses the xgrammar backend for schema
enforcement, with schemas inlined (resolving `$ref` references) for
compatibility. Guided decoding ensures outputs conform to Pydantic
models without post-processing.

## Hydra Configuration System

The pipeline uses Hydra for hierarchical configuration management with
OmegaConf for variable interpolation. Configuration is organized
hierarchically:

- `config.yaml` — Base configuration with defaults

- `pipeline/*.yaml` — Pipeline definitions (DAG specifications)

- `model/*.yaml` — Model configurations (vLLM engine parameters)

- `prompt/*.yaml` — Prompt templates (system prompts, user templates)

- `hydra/launcher/*.yaml` — Execution launchers (SLURM, local, Ray)

Hydra supports composition via `defaults` lists, allowing pipeline
configs to inherit from base configs and override specific sections.
Variable interpolation uses `${...}` syntax, supporting environment
variables (`${oc.env:VAR}`), config references (`${config.path}`), and
Hydra variables (`${hydra:run.dir}`).

The CLI entry point (`cli.py`) uses Hydra’s `@hydra.main` decorator with
`config_path="conf"` and `config_name="config"`. Pipeline selection is
done via command-line override: `pipeline=full_event_pipeline_us`. All
configuration can be overridden at runtime without code changes.

## Orchestration and Stage Execution

The orchestrator (`orchestrator.py`) manages pipeline execution as a
DAG. It performs topological sorting to determine execution order,
resolves artifact references (e.g., `classify.relevant`), and
coordinates stage execution via SLURM job submission or local execution.

Each stage is executed by a `StageRunner` that handles input loading,
stage function invocation, output saving, and metadata collection.
Runners support both pandas DataFrames and Ray Datasets, automatically
converting between formats as needed. Stage-specific overrides are
merged into the base configuration using OmegaConf’s `merge`
functionality.

**SLURM Integration:** SLURM integration uses submitit (Hydra’s submitit
launcher plugin) for job submission. Launcher configurations are stored
in `conf/hydra/launcher/*.yaml` and specify:

- Resource requirements: CPUs per task, GPUs per node, memory (GB),
  timeout (minutes)

- SLURM partition and job naming conventions

- Environment setup commands: virtual environment activation,
  environment variable exports, CUDA configuration

- Additional SLURM parameters: `gres` (GPU resources), `wckey`, custom
  `srun_args`

**Job Submission:** The orchestrator serializes stage context (config,
inputs, outputs, node specification) into a dictionary and submits jobs
via submitit’s `AutoExecutor`. Each job reconstructs context from
serialized data, creates a `StageExecutionContext`, and executes the
appropriate `StageRunner`. Job logs are stored in
`.slurm_jobs/STAGE_NAME/` within the Hydra output directory, enabling
centralized log management.

**Parallel Execution:** Stages with no dependencies can execute in
parallel when using different launchers. The orchestrator tracks job
status and waits for dependencies before submitting downstream stages.
Failed stages trigger retry logic (configurable attempts and exponential
backoff) before marking the pipeline as failed.

## Weights & Biases Integration

Experiment tracking is handled by a centralized WandbLogger
(`wandb_logger.py`) that manages run lifecycle, metrics logging, and
table logging. The logger is thread-safe and Ray-aware, automatically
skipping initialization in Ray workers to avoid socket conflicts that
can occur in distributed environments.

**W&B Platform Overview:** Weights & Biases is a comprehensive platform
for tracking and visualizing machine learning experiments, providing
tools for experiment tracking, model versioning, hyperparameter
optimization, and team collaboration. The platform supports real-time
metric visualization, run comparison, artifact management, and system
monitoring. W&B operates in two modes: online (real-time syncing to
cloud) and offline (deferred syncing for environments with limited
network access), with UAIR supporting both modes based on configuration.

**Configuration and Initialization:** W&B configuration is read from
Hydra config (`wandb.enabled`, `wandb.project`, `wandb.entity`,
`wandb.group`, etc.) with environment variable overrides for
flexibility. The system uses in-process mode (service daemon disabled
via `WANDB_DISABLE_SERVICE=true`) for SLURM/Ray compatibility, avoiding
socket conflicts in distributed environments. The logger uses W&B’s
Settings API to configure the library for distributed execution,
disabling git tracking and job creation where appropriate.

**Run Management:** Runs are grouped by pipeline execution using the
`WANDB_GROUP` environment variable, ensuring all stages from a single
pipeline run appear together in the W&B interface. Each stage creates a
separate run with a descriptive name (e.g., `classify`, `decompose`,
`verify`) and job type matching the stage name. The orchestrator creates
a parent run group, and child jobs inherit the group ID to maintain
organization across distributed execution.

**Metrics Logging:** The system logs comprehensive metrics including
token usage (prompt tokens, output tokens, total tokens), latency
(per-article processing time, batch-level latency), and stage-specific
statistics (relevance rates, verification success rates, classification
coverage). Metrics are logged at configurable intervals, with summary
metrics set at run completion. The logger supports both scalar metrics
(single values) and time-series metrics (values over steps/iterations).

**Table Logging:** Data tables are logged using W&B’s table API,
enabling interactive inspection of results within the W&B interface.
Tables are logged with configurable sampling (default 1000 rows) to
avoid overwhelming the interface while preserving representative
samples. The system logs stage outputs (e.g., classification results,
decomposition tuples) with preferred columns specified to highlight key
fields. Tables are organized into panel groups (e.g., “inspect_results”)
for better navigation.

**Compute Metadata:** Compute metadata is automatically collected and
logged, including CPU count, GPU count and types, model paths, Python
version, and system information. This metadata enables reproducibility
by capturing the execution environment for each run. The metadata is
logged to the run config, allowing filtering and comparison based on
compute resources.

**Distributed Execution Support:** The logger handles distributed
execution scenarios gracefully. In Ray workers, W&B initialization is
skipped to avoid socket conflicts, with metrics aggregated at the driver
process. For SLURM jobs, each job initializes its own W&B run, with
grouping handled via environment variables passed from the orchestrator.
The system supports both online and offline modes, with offline mode
enabling deferred syncing when network access is limited during job
execution.

## Verification Implementation

The verification system (`verification_core.py`) uses a two-model
approach: semantic similarity via embeddings and natural language
inference (NLI) for contradiction detection.

**Embedding Model:** Uses intfloat/e5-base (multilingual) with E5-style
query/passage prefixes. Text is encoded with mean pooling over token
embeddings, normalized to unit vectors, and compared via cosine
similarity. The model supports batch encoding for efficiency.

**NLI Model:** Uses mDeBERTa-v3-base-xnli-multilingual for three-way
classification (entailment, neutral, contradiction). The model handles
multilingual text and outputs probability distributions over the three
classes. Label indices are resolved dynamically from model config to
handle different model architectures.

**Verification Process:** For each tuple field, the system (1) splits
article text into sentences, (2) encodes the claim and all sentences,
(3) computes cosine similarities to find top-k matches, (4) runs NLI on
claim-premise pairs, and (5) combines scores using configurable
thresholds. The “combo” method requires similarity $`\geq`$ threshold
AND entailment $`\geq`$ threshold AND contradiction $`\leq`$ threshold.

Optional windowing groups consecutive sentences into windows
(configurable size and stride) to handle multi-sentence evidence spans.
This is particularly useful for complex claims that span multiple
sentences.

## Guided Decoding and Schema Enforcement

Structured outputs use vLLM’s guided decoding feature with JSON Schema
constraints. Schemas are generated from Pydantic models using
`model_json_schema()` (Pydantic v2) or `schema()` (Pydantic v1), then
inlined to resolve `$ref` references for xgrammar compatibility.

The guided decoding configuration includes:

- `json` — JSON Schema dict or string

- `disable_fallback: true` — Strict schema enforcement

- `disable_additional_properties: true` — Reject extra fields

Sampling parameters are stabilized before adding guided decoding to
ensure compatibility. The system handles both dict and string schema
formats, with automatic conversion as needed for PyArrow serialization
compatibility.

## Error Handling and Fault Tolerance

The pipeline includes comprehensive error handling at multiple levels:

**Stage-Level:** Each stage function includes try-except blocks around
critical operations (Ray init, model loading, batch processing). Errors
are logged with context and, where possible, processing continues with
degraded functionality (e.g., heuristic fallback if LLM unavailable).

**Data-Level:** Ray Data supports configurable error handling via
`max_errored_blocks`. Failed blocks are logged and can be skipped or
retried. Pandas mode includes per-row error handling in apply functions.

**Orchestration-Level:** Stage execution failures trigger retry logic
(configurable attempts and backoff). Failed stages are logged to the
pipeline manifest, and downstream stages can be configured to skip or
proceed with partial inputs.

GPU environment sanitization ensures CUDA_VISIBLE_DEVICES matches SLURM
allocations, preventing conflicts in multi-GPU setups. The system probes
GPU availability before initialization and adjusts tensor parallelism
accordingly.

</div>

# Results

<div class="fullwidth">

## Pipeline Flow and Article Processing

The UAIR pipeline processes articles through five sequential stages,
with significant filtering occurring at classification and verification
stages.
Figure <a href="#fig:pipeline-flow-sankey" data-reference-type="ref"
data-reference="fig:pipeline-flow-sankey">2</a> visualizes the flow of
articles through the pipeline using a Sankey diagram, showing how
articles are filtered and processed at each stage.

The pipeline begins with 29,372 input articles from the US dataset. At
the classification stage, articles are evaluated for relevance to AI
risks using LLM-based binary classification. This stage filters the
dataset to 578 relevant articles (1.97% retention), with 28,794 articles
(98.0%) classified as not relevant and excluded from downstream
processing. The classification stage serves as the primary filtering
mechanism, removing articles that do not contain substantive AI-related
content.

All 578 relevant articles proceed to the decomposition stage, where they
are processed into structured tuples. This stage extracts 13 core fields
capturing deployment context, actors, locations, and impacts. No
articles are lost at this stage, as decomposition operates on all
relevant articles regardless of information completeness (missing fields
are explicitly tracked).

The verification stage applies semantic similarity and natural language
inference models to validate extracted tuples against source article
text. This stage represents the second major filtering point: of 578
decomposed articles, only 61 articles (10.5%) pass core tuple
verification thresholds, with 517 articles (89.5%) failing verification
and excluded from regulatory classification. The verification stage acts
as a quality gate, ensuring that only tuples with sufficient evidence in
the source text proceed to classification stages.

The final two stages—EU AI Act classification and risks/benefits
assessment—operate on all 61 verified articles. These stages perform
regulatory classification and impact assessment, producing structured
outputs for policy analysis. While no articles are filtered at these
stages, the EU AI Act classification flags 17 articles (27.9% of
verified articles) as “too vague to process,” providing transparency
about classification limitations.

Table <a href="#tab:pipeline-flow-summary" data-reference-type="ref"
data-reference="tab:pipeline-flow-summary">1</a> summarizes article
counts, cumulative losses, stage-specific losses, and retention rates at
each pipeline stage. The pipeline achieves a final retention rate of
0.21%, processing 61 articles from the original 29,372 inputs. This high
filtering rate reflects the pipeline’s focus on high-quality, verifiable
AI risk information suitable for regulatory analysis.

<figure id="fig:pipeline-flow-sankey" data-latex-placement="htbp">
<embed src="figures/pipeline_flow_sankey.pdf" style="width:95.0%" />
<figcaption>Sankey diagram showing the flow of articles through the UAIR
pipeline. The diagram visualizes article counts at each stage (nodes)
and the flow of articles between stages (links). Blue flows represent
articles progressing through the pipeline, while red flows represent
articles lost at filtering stages. The pipeline processes 29,372 input
articles, filtering to 578 relevant articles at classification (98.0%
loss) and further reducing to 61 verified articles at verification
(89.4% loss from decomposed articles).</figcaption>
</figure>

<div id="tab:pipeline-flow-summary">

| Stage         | Article Count | Cumulative Loss | Stage Loss | Retention Rate (%) |
|:--------------|:-------------:|:---------------:|:----------:|:------------------:|
| Input         |    29,372     |        0        |     —      |       100.00       |
| Classify      |      578      |     28,794      |   28,794   |        1.97        |
| Decompose     |      578      |     28,794      |     —      |        1.97        |
| Verify        |      61       |     29,311      |    517     |        0.21        |
| EU AI Act     |      61       |     29,311      |     —      |        0.21        |
| Risk/Benefits |      61       |     29,311      |     —      |        0.21        |

Pipeline flow summary: article counts and retention rates at each stage.
The pipeline processes 29,372 input articles, filtering to 578 relevant
articles (1.97% retention) at classification, then further reducing to
61 verified articles (0.21% final retention) after verification.

</div>

## Performance Characteristics

Pipeline performance varies by stage and dataset size. On a 2x RTX A6000
GPU setup:

- **Classification:** Processes approximately 100–1000 articles/second
  depending on article length and batch size. Typical batch size: 16
  articles, latency: 0.1–1.0 seconds per batch.

- **Decomposition:** Processes approximately 10–50 articles/second due
  to longer context windows and more complex extraction. Typical batch
  size: 4 articles, latency: 0.5–2.0 seconds per batch.

- **Verification:** CPU-bound process, processes approximately 100–500
  tuples/second depending on article length and verification method. Can
  be parallelized across multiple CPU cores.

- **EU Act Classification:** Similar to decomposition, processes
  approximately 10–50 articles/second with batch size 4.

- **Risks/Benefits:** Similar performance to EU Act classification, with
  slightly longer processing times due to more complex output schemas.

Memory usage scales with batch size and context length. Typical memory
footprint: 20–40GB GPU memory per GPU for 30B parameter models with 16k
context, plus 10–30GB CPU memory for Ray object store and data
processing.

## Data Quality Metrics

The pipeline tracks several quality metrics automatically:

**Classification Quality:** Relevance rates (percentage of articles
classified as relevant) vary by source and time period. Keyword
pre-filtering typically filters out 20-30% of articles in our
experimental datasets.

**Extraction Quality:** The `missing` field provides transparency about
information gaps.

**Verification Quality:** Verification acts as a quality gate for
downstream classification stages, ensuring that extracted tuples
actually match article intent and are about AI use cases.

**Classification Coverage:** Vague articles are explicitly flagged,
rather than misclassified.

## News Article Analysis Results

Analysis of the processed news articles reveals patterns in AI risk
deployment across domains, temporal trends in media coverage, and
regulatory risk distributions. The following tables and visualizations
contextualize these findings within the broader landscape of AI risk
reporting.

### Deployment Domain Distribution

Table <a href="#tab:top_domains_by_article_count" data-reference-type="ref"
data-reference="tab:top_domains_by_article_count">2</a> presents the top
10 deployment domains by article count in the processed dataset. Public
and private transportation dominates with 966 articles (16.7% of
relevant articles), reflecting the high visibility of AI deployments in
urban mobility systems, autonomous vehicles, and traffic management.
Arts and Entertainment follows with 800 articles, highlighting media
coverage of AI-generated content, deepfakes, and creative applications.
Transport and Logistics (597 articles) and Education and vocational
training (483 articles) round out the top domains, demonstrating the
breadth of AI deployment across critical urban infrastructure sectors.

The domain distribution reflects both the prevalence of AI deployments
in these sectors and the newsworthiness of incidents and developments in
these areas. Transportation-related domains (Public and private
transportation, Transport and Logistics) together account for 1,563
articles (27.0% of relevant articles), indicating that mobility and
logistics represent a major focus of AI risk reporting in news media.

<div id="tab:top_domains_by_article_count">

| **Deployment domain**                  | **Num. articles** |
|:---------------------------------------|------------------:|
| **Deployment domain**                  | **Num. articles** |
| Health and Healthcare                  |                76 |
| Media and Communication                |                70 |
| Transport and Logistics                |                53 |
| Social Media                           |                52 |
| Energy                                 |                32 |
| Education and vocational training      |                30 |
| Finance and Investment                 |                22 |
| Entrepreneurship                       |                22 |
| Urban Planning                         |                22 |
| Government Services and Administration |                22 |

Top 10 AI Deployment Domains by Article Count

</div>

Table <a href="#tab:top_domains_detailed" data-reference-type="ref"
data-reference="tab:top_domains_detailed">3</a> provides a detailed
breakdown of risks, harms, and benefits reported for each of the top 10
deployment domains. The table illustrates the complexity of AI impacts
across domains, showing that most deployments involve both potential
benefits and risks. For example, Public and private transportation shows
substantial benefits (781+ reported benefits) alongside significant
risks (728+ potential risks) and documented harms (669+ actual harms),
reflecting the dual nature of AI deployment in critical infrastructure
systems.

The detailed breakdown reveals domain-specific patterns: Healthcare
domains show high proportions of benefits related to diagnostic
capabilities and patient care, while also documenting risks of
misdiagnosis and privacy violations. Education domains demonstrate
concerns about academic integrity and student development alongside
benefits of personalized learning and accessibility. Finance domains
highlight both fraud prevention benefits and discrimination risks in
automated decision-making systems.

<div id="tab:top_domains_detailed">

<table>
<caption>Top 10 AI Deployment Domains by Article Count with Reported
Risks, Harms, and Benefits</caption>
<tbody>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential misdiagnosis of health conditions due to inaccurate
vital sign monitoring by PanopticAI’s technology on consumer
devices.</p></li>
<li><p>Potential loss of life for patients in need of blood due to
inefficient or delayed blood delivery systems in Nigeria.</p></li>
<li><p>Potential financial loss and waste of public funds due to high
costs and poor performance of the SmartHealth app.</p></li>
<li><p>Reduced trust in digital health initiatives due to failure to
meet user targets and lack of transparency around the contract and
costs.</p></li>
<li><p>Continued dependency on foreign technology providers could hinder
interoperability with local clinical systems.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Individuals were exposed to inaccurate health monitoring due to
PanopticAI’s technology misinterpreting sensor data from smartphones and
tablets.</p></li>
<li><p>Mothers and newborns in Nigeria were at risk of death due to lack
of timely access to safe blood.</p></li>
<li><p>Patients were denied timely access to healthcare services due to
low user adoption and technical limitations of the SmartHealth
app.</p></li>
<li><p>Doctors were unable to use the SmartHealth app consistently due
to implementation barriers and lack of integration with existing
systems.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Improved access to early disease detection through AI-powered
ultrasound in low-resource settings in Kenya.</p></li>
<li><p>Enhanced accuracy and efficiency in breast cancer screening using
AI-based ultrasound compared to traditional mammograms in
Taiwan.</p></li>
<li><p>Streamlined contour delineation in radiation therapy planning
using AI, potentially reducing treatment preparation time at the Mayo
Clinic.</p></li>
<li><p>Increased accuracy of health care provider information on Google
Search through automated verification using Duplex technology.</p></li>
<li><p>Improved short-term memory by 15 percent and working memory by 25
percent in human volunteers due to targeted neural stimulation via a
brain implant.</p></li>
<li><p>Improved access to neurological diagnostics for over four billion
people lacking reliable services due to BrainCapture’s portable EEG
system and AI interpretation models.</p></li>
<li><p><em>[...and 67 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential misdirection of readers due to machine learning
algorithms prioritizing engagement over content accuracy in news
presentation.</p></li>
<li><p>Potential reduction in reader engagement due to incomplete
machine learning deployment caused by insufficient article count in
container.</p></li>
<li><p>Potential spread of misinformation due to machine learning
systems prioritizing content based on engagement metrics rather than
factual accuracy.</p></li>
<li><p>Potential misalignment between user preferences and content
exposure due to incomplete machine learning activation threshold being
unmet.</p></li>
<li><p>Potential amplification of misinformation due to machine learning
systems prioritizing engagement over accuracy in news content
delivery.</p></li>
<li><p>Potential misinformation and reduced reader engagement due to
machine learning system malfunctioning when insufficient articles are in
the container.</p></li>
<li><p><em>[...and 26 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Readers were exposed to a manipulated or misleading headline due
to ML-based content curation failing to prevent promotional or
irrelevant article placement.</p></li>
<li><p>Readers were exposed to a machine learning feature that failed to
function due to insufficient content input, causing artificial
engagement gaps in the news feed.</p></li>
<li><p>Readers were exposed to potentially misleading or unverified
information due to machine learning algorithms prioritizing engagement
over accuracy in content selection.</p></li>
<li><p>Readers were exposed to personalized content based on queued
articles due to machine learning algorithms not being activated until 30
or more cards were added.</p></li>
<li><p>Readers were exposed to potentially misleading or unverified
political content due to machine learning algorithms surfacing queued
articles without sufficient editorial oversight.</p></li>
<li><p>Readers were exposed to irrelevant or low-quality content due to
machine learning features failing to properly surface relevant articles
when fewer than 30 cards were in the container.</p></li>
<li><p><em>[...and 23 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Improved reader engagement through personalized content delivery
based on individual interests.</p></li>
<li><p>Improved content relevance for readers based on individual
interests and preferences through machine learning.</p></li>
<li><p>Improved user engagement through personalized content delivery
based on individual interests and preferences.</p></li>
<li><p>Personalized content delivery to readers based on individual
interests and preferences when sufficient content cards were
queued.</p></li>
<li><p>Improved content relevance for readers through machine
learning-driven personalization based on individual interests and
preferences.</p></li>
<li><p>Users were presented with personalized content based on their
individual interests and preferences when the machine learning feature
was properly activated.</p></li>
<li><p><em>[...and 20 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential failure to scale drone delivery services due to
regulatory delays and internal workforce reductions.</p></li>
<li><p>Delayed advancement of automated aerial logistics due to
technology and policy challenges in operating drones over populated
areas.</p></li>
<li><p>Potential endangerment of an infant in a stolen vehicle due to
delayed GPS tracking by Volkswagen Car-Net.</p></li>
<li><p>Potential endangerment of a pregnant woman due to delayed
emergency response from Volkswagen Car-Net.</p></li>
<li><p>Serious breach of emergency response protocol by Volkswagen
Car-Net in a life-threatening situation.</p></li>
<li><p>Potential disruption of autonomous vehicle research and
development due to limited lidar sensor availability.</p></li>
<li><p><em>[...and 21 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Amazon discontinued drone delivery operations in Lockeford,
California, due to project delays and resource reallocation.</p></li>
<li><p>Residents of Lockeford, California, lost access to scheduled
drone delivery services despite earlier expectations.</p></li>
<li><p>An infant was left unattended in a stolen vehicle due to delayed
GPS tracking by Volkswagen Car-Net.</p></li>
<li><p>A pregnant woman sustained serious injuries including a broken
pelvis and broken elbow after being run over by carjackers.</p></li>
<li><p>The mother’s life was put at risk due to delayed emergency
response from Volkswagen Car-Net.</p></li>
<li><p>University of Waterloo’s autonomous vehicle research was delayed
due to a malfunctioning lidar sensor and a six-month wait for a
replacement.</p></li>
<li><p><em>[...and 17 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Increased delivery predictability for consumers due to AI-driven
forecasting of shipment arrival times.</p></li>
<li><p>Amazon cleared a significant regulatory hurdle when the FAA
loosened restrictions on drone flights over roadways and cars.</p></li>
<li><p>Amazon advanced drone delivery technology with the introduction
of the MK30 drone, designed to be smaller, quieter, and capable of
flying in light rain.</p></li>
<li><p>Amazon secured a strategic partnership with Embention to provide
safety-related hardware and software for drone operations.</p></li>
<li><p>Amazon maintained regulatory compliance by obtaining Part 135
certification from the FAA in 2020, enabling commercial drone deliveries
under certain conditions.</p></li>
<li><p>Recovery of an infant from a stolen vehicle after GPS tracking
was eventually activated following payment.</p></li>
<li><p><em>[...and 50 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential spread of disinformation due to unlabelled AI-generated
content on platforms such as Google, Meta, Microsoft, TikTok, and
Twitter.</p></li>
<li><p>Increased risk of public deception due to failure of tech
companies to implement AI content detection and labeling early.</p></li>
<li><p>Undermining of public trust in digital content due to generative
AI producing realistic false imagery and narratives.</p></li>
<li><p>Potential manipulation of public opinion due to AI-generated
disinformation campaigns by Chinese state-aligned actors on social media
platforms.</p></li>
<li><p>Increased risk of polarized political discourse due to
sophisticated impersonation tactics used by covert influence
operations.</p></li>
<li><p>Potential exposure of personal data to unauthorized AI training
due to ineffective data subject rights implementation.</p></li>
<li><p><em>[...and 84 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Users were exposed to deceptive content due to lack of clear
labeling of AI-generated material on online platforms.</p></li>
<li><p>U.S. voters and residents were misled due to Chinese
state-aligned influence campaigns impersonating American users on social
media platforms.</p></li>
<li><p>Public discourse on social media was distorted due to
AI-generated visual content from Chinese influence operations.</p></li>
<li><p>Users were unable to submit data deletion requests due to a
software bug in Meta’s Generative AI Data Subject Rights form.</p></li>
<li><p>Users’ personal information from third-party sources remained
potentially used in AI training despite their objections due to system
errors.</p></li>
<li><p>Fact-checkers were overburdened and demoralized due to Facebook’s
referral system operating without transparency and with inadequate
technical support.</p></li>
<li><p><em>[...and 76 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Improved transparency on online platforms due to EU-mandated
labeling of AI-generated content.</p></li>
<li><p>Enhanced user awareness and informed decision-making due to clear
identification of AI-generated material.</p></li>
<li><p>Enhanced detection of disinformation campaigns by Microsoft
through new threat analysis methods.</p></li>
<li><p>Users gained the ability to access, correct, or delete personal
information used in AI training from third-party sources.</p></li>
<li><p>Meta demonstrated compliance with data protection laws in
jurisdictions outside the U.S. by enabling data subject rights
requests.</p></li>
<li><p>Transparency in AI training data usage was improved through the
introduction of a dedicated rights form.</p></li>
<li><p><em>[...and 62 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential degradation of public water quality due to excessive
water withdrawal and discharge of briney blowdown from cooling
systems.</p></li>
<li><p>Increased risk of water shortages during droughts due to rising
demand from AI-powered data centers.</p></li>
<li><p>Long-term environmental degradation of local watersheds due to
sustained high water usage by data centers in a climate-stressed
region.</p></li>
<li><p>Potential financial loss due to inaccuracies in AI-driven savings
estimates caused by a software bug.</p></li>
<li><p>Undue complexity in financial reconciliation due to
microtransactions from fragmented order processing.</p></li>
<li><p>Loss of consumer trust due to lack of transparency in product
origin from third-party partners.</p></li>
<li><p><em>[...and 3 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Residents in West Des Moines experienced deteriorated water
quality due to increased water consumption by Microsoft data centers
during drought conditions.</p></li>
<li><p>Local water supplies were strained during periods of abnormally
dry weather, exacerbating water stress in a region already facing
climate-related challenges.</p></li>
<li><p>Water intended for municipal and agricultural use was diverted to
data center cooling systems during peak heat, contributing to water
scarcity concerns.</p></li>
<li><p>The user experienced a miscalculation of total savings due to a
bug in Jet’s pricing algorithm.</p></li>
<li><p>The user’s checking account reflected multiple small transactions
instead of a single consolidated order, complicating financial
tracking.</p></li>
<li><p>The user was unknowingly exposed to products from Walmart due to
lack of transparency in product sourcing from third-party
partners.</p></li>
<li><p><em>[...and 2 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Microsoft’s data centers supported the training of advanced AI
models like ChatGPT-4, enabling broader access to AI-powered
technologies.</p></li>
<li><p>Data center operations contributed to regional economic activity
through infrastructure investment and job creation.</p></li>
<li><p>Microsoft’s commitment to achieving water-positive status by 2030
may lead to future innovations in water-efficient cooling
technologies.</p></li>
<li><p>Reduced overall shopping cost by $86.81 compared to alternative
online platforms.</p></li>
<li><p>Accelerated access to discounts and dynamic pricing through
AI-powered savings optimization.</p></li>
<li><p>Improved convenience by consolidating multiple purchases into a
single online order.</p></li>
<li><p><em>[...and 25 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential overreliance on digital devices in early education due
to lack of regulated usage guidelines.</p></li>
<li><p>Risk of decreased physical interaction and social development
among young learners due to prolonged tablet use.</p></li>
<li><p>Possible data privacy risks due to location-tracking software on
tablets without explicit parental consent.</p></li>
<li><p>Potential erosion of learning quality due to overreliance on AI
for assignment completion.</p></li>
<li><p>Risk of diminished critical thinking among students due to
passive use of AI for content generation.</p></li>
<li><p>Possibility of inflated grades not reflecting true student
competence due to AI-assisted submissions.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Students in public schools were exposed to unmonitored screen
time due to insufficient parental oversight of tablet usage.</p></li>
<li><p>Students were academically dishonest due to copying and pasting
AI-generated content without original engagement.</p></li>
<li><p>Lecturers were misled about student understanding due to
submission of AI-generated work presented as original.</p></li>
<li><p>Academic integrity was compromised due to widespread plagiarism
facilitated by AI tools.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Young African women and girls gained foundational digital skills
through an eight-day coding boot camp.</p></li>
<li><p>23 innovation prototypes were created and showcased, contributing
to sustainable development goals.</p></li>
<li><p>Special recognition was given to a 3D medical model for
pancreatic cancer and viral hepatitis surgery, highlighting potential
health applications.</p></li>
<li><p>Over 60 girls from Mozambique and Angola received hands-on
training in AI, robotics, and web development through the Connected
African Girls Coding Camp.</p></li>
<li><p>Angolan university students gained access to virtual tech talks
and a virtual tour of Huawei headquarters to learn about 5G, cloud, and
AI technologies.</p></li>
<li><p>Young African learners were introduced to artificial intelligence
and robotics through a hybrid bootcamp organized in
Brazzaville.</p></li>
<li><p><em>[...and 31 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential financial loss for UK crypto users due to limited
banking options for bitcoin companies.</p></li>
<li><p>Potential collapse of small private equity and venture capital
funds due to the proposed regulatory threshold increase for individual
investors.</p></li>
<li><p>Potential criminal prosecution of traders due to the U.S.
Department of Justice’s enhanced data analysis capabilities detecting
spoofing in commodities futures markets.</p></li>
<li><p>Increased risk of legal actions for banks and trading firms due
to the U.S. Department of Justice’s expanded surveillance and
prosecution of market manipulation beyond traditional
categories.</p></li>
<li><p>Potential financial loss for investors due to AI-driven
investment recommendations based on fabricated data.</p></li>
<li><p>Market instability due to reliance on AI systems generating false
investment signals.</p></li>
<li><p><em>[...and 4 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>UK customers were previously unable to quickly and safely buy
bitcoins due to lack of banking access for crypto firms.</p></li>
<li><p>Small venture capital and private equity fund managers were
unable to raise capital due to increased investor thresholds imposed by
China’s securities regulators.</p></li>
<li><p>JP Morgan Chase traders were prosecuted due to the U.S.
Department of Justice using advanced data analysis tools to detect
spoofing patterns in commodities futures trading.</p></li>
<li><p>Traders at Deutsche Bank, UBS, and Bank of Nova Scotia were
charged due to the U.S. Department of Justice identifying suspicious
trading patterns through data mining.</p></li>
<li><p>Investors were misled due to misuse of AI-driven financial
forecasts by a company executive.</p></li>
<li><p>Stock market participants were negatively impacted due to
AI-generated misleading investment signals.</p></li>
<li><p><em>[...and 4 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Improved accessibility to bitcoin purchases in the UK due to
Safello’s physical presence and local banking partnership.</p></li>
<li><p>Reduced risk of financial loss for small investors due to
stricter eligibility requirements for investing in private equity and
venture capital funds.</p></li>
<li><p>Improved detection of sophisticated market manipulation due to
advancement in data mining and pattern recognition tools by the U.S.
Department of Justice.</p></li>
<li><p>Stronger deterrence against spoofing practices in financial
markets due to the U.S. Department of Justice’s proactive data-driven
enforcement strategy.</p></li>
<li><p>Improved market data throughput and reduced latency in trading
systems due to high-performance data feed handling software.</p></li>
<li><p>Increased efficiency in financial planning due to AI-based
portfolio analysis.</p></li>
<li><p><em>[...and 3 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential erosion of artists’ creative autonomy and legacy due to
unauthorized virtual representation of band members as digital
avatars.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Kiss band members’ identities were commodified and exploited for
commercial profit due to the creation of digital avatars without their
explicit consent for long-term virtual existence.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Increased startup funding for Israeli technology companies due to
Intel Capital’s $435 million investment in 90 startups.</p></li>
<li><p>Over 38 startups received funding totaling CZK 105 million due to
participation in the technology incubation project.</p></li>
<li><p>Startups received strategic innovation support in key growth
areas including artificial intelligence, creative industries, circular
economy, and mobility.</p></li>
<li><p>Digital preservation and continued monetization of the Kiss
brand’s intellectual property through virtual performances.</p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential obstruction of pedestrian traffic due to users not
parking shared electric micro-mobility vehicles in designated
zones.</p></li>
<li><p>Potential invasion of privacy of citizens in public areas due to
Google Street View capturing panoramic images across 80 Uruguayan
cities.</p></li>
<li><p>Potential privacy violations due to continuous monitoring of
public spaces using AI-powered camera and sensor systems.</p></li>
<li><p>Risk of unjustified or disproportionate traffic enforcement due
to automated fine generation without human oversight.</p></li>
<li><p>Financial risk for the municipality due to long-term debt
obligations from the bid loan with a 25-year amortization
period.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Pedestrians were obstructed by improperly parked electric
scooters and bikes due to users failing to follow parking rules enforced
by Bolt’s AI system.</p></li>
<li><p>Uruguayan residents were photographed without consent in public
spaces due to Google Street View collecting panoramic images in
Uruguay.</p></li>
<li><p>Citizens in Montevideo were subjected to surveillance through
camera and sensor networks without clear public consent or
transparency.</p></li>
<li><p>Residents faced increased financial burden due to projected 50%
rise in traffic fines from automated enforcement systems.</p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Enhanced pedestrian connectivity between Grand Avenue Park and
the Everett waterfront district due to the completion of the Grand
Avenue Park Bridge.</p></li>
<li><p>Improved urban heat mitigation due to AI-driven tree coverage
analysis in Los Angeles.</p></li>
<li><p>Cities and municipalities were enabled to define and implement
comprehensive climate strategies due to the ClimateOS platform.</p></li>
<li><p>Reduced energy consumption by up to 30% due to LED lighting and
smart lighting management system.</p></li>
<li><p>Enhanced 5G and Wi-Fi network coverage through integration of
microcell stations in lampposts.</p></li>
<li><p>Improved urban management through real-time environmental and
traffic data collection.</p></li>
<li><p><em>[...and 13 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
<tr>
<td style="text-align: left;"><strong>Risks</strong></td>
<td style="text-align: left;"><strong>Harms</strong></td>
<td style="text-align: left;"><strong>Benefits</strong></td>
</tr>
<tr>
<td style="text-align: left;"><ul>
<li><p>Potential endangerment of national security and political
stability due to foreign state-sponsored espionage using NSO Group’s
Pegasus spyware.</p></li>
<li><p>Violation of privacy rights of public officials and civil society
figures due to covert surveillance by a foreign client of NSO
Group.</p></li>
<li><p>Diplomatic tensions between Spain and Morocco due to alleged use
of Pegasus spyware targeting Spanish officials and activists.</p></li>
<li><p>Dilution of public trust in state intelligence operations due to
unauthorized surveillance and lack of judicial oversight.</p></li>
<li><p>Potential violation of privacy rights due to use of Pegasus
spyware by Bahraini government authorities.</p></li>
<li><p>Risk of persecution for political dissenters due to surveillance
enabled by NSO Group’s Pegasus spyware.</p></li>
<li><p><em>[...and 22 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Spanish Prime Minister Pedro Sánchez and Defense Minister
Margarita Robles were compromised due to external illicit surveillance
using NSO Group’s Pegasus spyware.</p></li>
<li><p>Aminatou Haidar, a Western Sahara human rights activist, was
subjected to potential surveillance due to targeting by a client of NSO
Group’s Pegasus spyware.</p></li>
<li><p>Journalist Ignacio Cembrero was exposed to possible surveillance
due to inclusion in the Pegasus spyware target list.</p></li>
<li><p>Members of the Catalan independence movement, including regional
president Pere Aragonès, were monitored due to unauthorized deployment
of Pegasus spyware.</p></li>
<li><p>Three Bahraini nationals critical of the royal family were
surveilled without consent due to government authorities using Pegasus
spyware developed by NSO Group.</p></li>
<li><p>Individuals’ private communications were compromised due to
unauthorized access to their mobile devices via Pegasus
spyware.</p></li>
<li><p><em>[...and 19 more]</em></p></li>
</ul></td>
<td style="text-align: left;"><ul>
<li><p>Accelerated release of millions of historical government
documents to the public due to AI-powered classification
detection.</p></li>
<li><p>Improved detection of phone number targeting patterns used in
state-sponsored espionage, as revealed through the Pegasus Project
investigative journalism initiative.</p></li>
<li><p>Increased scrutiny and transparency around the use of
surveillance technologies by intelligence agencies and private
vendors.</p></li>
<li><p>Enhanced security threat monitoring by government intelligence
agencies due to access to data from compromised devices.</p></li>
<li><p>Enhanced capability to analyze potential covert communication
channels among hostile intelligence agencies and criminal
networks.</p></li>
<li><p>Improved timeliness and relevance of national statistics due to
adoption of digital data collection methods in Ethiopia.</p></li>
<li><p><em>[...and 8 more]</em></p></li>
</ul></td>
</tr>
<tr>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
<td style="text-align: left;"></td>
</tr>
</tbody>
</table>

</div>

### EU AI Act Risk Classifications by Domain

Figure <a href="#fig:eu-ai-act-classifications" data-reference-type="ref"
data-reference="fig:eu-ai-act-classifications">3</a> presents a heatmap
showing the distribution of EU AI Act risk classifications across
deployment domains identified in the news articles. The analysis reveals
that High Risk classifications dominate in healthcare and law
enforcement domains, reflecting the regulatory framework’s emphasis on
protecting fundamental rights in these sensitive areas. Prohibited
practices are rare but concentrated in specific domains such as
biometric identification, where real-time remote biometric
identification systems face strict limitations under the Act. The
heatmap demonstrates how different domains exhibit distinct risk
profiles, with Limited or Low Risk classifications more common in
domains like transportation and logistics, where AI systems often serve
as safety components rather than decision-making tools affecting
individual rights.

The distribution patterns reflect both the nature of AI deployments
reported in news media and the regulatory framework’s risk-based
approach. Domains with higher public visibility and direct impact on
individual rights—such as law enforcement, healthcare, and
employment—show higher proportions of High Risk classifications,
consistent with the EU AI Act’s focus on protecting fundamental rights
in these contexts.

<figure id="fig:eu-ai-act-classifications" data-latex-placement="htbp">
<embed src="figures/eu_ai_act_classifications_heatmap.pdf"
style="width:75.0%" />
<figcaption>Heatmap showing distribution of EU AI Act risk
classifications across deployment domains and risk categories.
Prohibited practices are rare but concentrated in specific domains
(e.g., biometric identification). High Risk classifications dominate in
healthcare and law enforcement domains.</figcaption>
</figure>

### Temporal Trends in AI-Relevant News Coverage

Figure <a href="#fig:growth-of-ai-relevant-articles" data-reference-type="ref"
data-reference="fig:growth-of-ai-relevant-articles">4</a> illustrates
temporal trends in the fraction of articles classified as AI-relevant
over time. The analysis reveals a steady increase in the proportion of
news articles containing substantive AI-related content, reflecting both
the growing deployment of AI systems across urban environments and
increased media attention to AI-related incidents and developments. This
trend suggests that AI risks and deployments are becoming more prominent
in public discourse, with news media increasingly covering AI-related
topics as these technologies become more pervasive in daily life.

The temporal analysis provides insights into how media coverage of AI
risks has evolved, potentially reflecting both actual increases in AI
deployment and incidents, as well as growing public awareness and media
interest in AI-related topics. This trend has implications for risk
monitoring and regulatory compliance, as increased coverage may indicate
both greater AI adoption and heightened public scrutiny of AI systems.

<figure id="fig:growth-of-ai-relevant-articles"
data-latex-placement="htbp">
<embed src="figures/fraction_relevant_articles_per_year.pdf"
style="width:80.0%" />
<figcaption>Temporal trends in AI-relevant article fraction. The
proportion of articles classified as AI-relevant has increased steadily
over time, with a dip during the Coronavirus pandemic, reflecting both
growing AI deployment and improved media coverage of AI-related
topics.</figcaption>
</figure>

</div>

# Discussion

<div class="fullwidth">

## Design Decisions and Trade-offs

The UAIR pipeline makes several key design decisions that balance
performance, accuracy, and maintainability:

**Configuration-Driven Architecture:** The use of Hydra for
configuration management enables experimentation without code changes,
but requires careful schema design to prevent configuration errors. The
hierarchical config structure provides flexibility while maintaining
consistency across pipeline variants. The trade-off is increased
complexity in configuration debugging, mitigated by comprehensive
validation and clear error messages.

**Parquet as Intermediate Format:** Persisting all intermediate results
as Parquet files enables partial execution and result inspection, but
increases storage requirements (typically 2–5x compared to
streaming-only approaches). The trade-off favors reproducibility and
debuggability over storage efficiency, which is acceptable given the
value of result inspection and incremental processing for research
workflows.

**Guided Decoding vs. Post-Processing:** Using vLLM’s guided decoding
ensures schema compliance at generation time, eliminating the need for
post-processing and reducing error rates from 5–10% (with
post-processing) to less than 1%. However, it requires careful schema
design, can slightly reduce generation flexibility, and adds
computational overhead (approximately 10–15% slower generation). The
accuracy benefits outweigh the performance cost for structured
extraction tasks.

**Verification Gating:** Requiring core tuple verification before
classification ensures high-quality inputs but reduces coverage by
20–40% (depending on verification thresholds). The explicit
`too_vague_to_process` flag provides transparency about coverage gaps,
enabling users to understand and adjust thresholds based on their
quality/coverage trade-offs.

**Multi-Stage vs. End-to-End:** The five-stage design enables
independent optimization, debugging, and partial execution, but
increases complexity and potential for schema drift. Each stage can be
tuned independently (batch sizes, model parameters, thresholds),
providing flexibility at the cost of increased configuration complexity.

**SLURM vs. Local Execution:** SLURM integration enables
production-scale processing on shared clusters but adds complexity in
job management and debugging. Local execution (via `launcher: null`)
enables fast iteration but is limited by local resources. The system
supports both modes seamlessly, allowing development on local machines
and production runs on clusters.

## Scalability Considerations

The pipeline is designed to scale from small test runs to
production-scale processing:

**Memory Efficiency:** Ray Data’s lazy evaluation and streaming I/O
enable processing datasets larger than available RAM. Object store
sizing (90% of job memory) balances memory efficiency with data sharing
needs.

**GPU Utilization:** vLLM’s continuous batching and tensor parallelism
enable efficient GPU utilization. Memory utilization settings (0.8–0.9)
balance throughput with stability, leaving headroom for memory spikes.

**Distributed Execution:** SLURM integration enables scaling across
multiple nodes, though current implementation focuses on single-node
multi-GPU setups. Future work could extend to multi-node Ray clusters.

## Limitations and Future Work

Several limitations present opportunities for future improvement:

**Multilingual Support:** While models support multilingual text, prompt
templates are primarily English-focused. Localized prompts could improve
extraction quality for non-English articles.

**Verification Model Selection:** Current verification models (e5-base,
mDeBERTa-base) are relatively small for accuracy/speed trade-offs.
Larger models could improve verification accuracy but would increase
computational costs.

**Schema Evolution:** Adding new fields to tuples requires coordinated
updates across decomposition, verification, and downstream stages. A
schema registry could facilitate versioning and migration.

**Error Recovery:** While the pipeline includes error handling, recovery
from partial failures could be improved. Checkpointing and resume
capabilities would enable more robust long-running executions.

**Real-Time Processing:** Current implementation focuses on batch
processing. Streaming processing capabilities could enable
near-real-time monitoring of AI risks as news articles are published.

## Reproducibility and Open Science

The pipeline design emphasizes reproducibility:

**Deterministic Execution:** Temperature 0 for classification stages
ensures deterministic outputs. Seed values are configurable for
controlled randomness in verification and other stochastic components.

**Experiment Tracking:** W&B integration captures full configuration,
compute metadata, and results, enabling experiment comparison and
reproduction.

**Version Control:** Configuration files are version-controlled, and
model paths are explicit, enabling exact reproduction of results.

**Documentation:** Comprehensive inline documentation and configuration
comments facilitate understanding and modification.

## Policy and Regulatory Applications

The pipeline outputs are designed to support policy analysis and
regulatory monitoring:

**EU AI Act Compliance:** Classification outputs map directly to EU AI
Act risk categories, enabling compliance monitoring and risk assessment
at scale.

**Trend Analysis:** Temporal and geographic analysis of classifications
can identify emerging risks and regulatory gaps.

**Impact Assessment:** Human rights and SDG impact assessments provide
structured data for policy evaluation and stakeholder engagement.

**Transparency:** Verification scores and missing field tracking provide
transparency about data quality and coverage limitations.

## Conclusion

The UAIR pipeline provides a comprehensive, scalable system for
extracting and classifying AI risk information from large-scale news
collections. Its configuration-driven architecture, distributed
processing capabilities, and structured outputs make it suitable for
both research and policy applications. The system’s modular design
enables extension and customization while maintaining consistency and
reproducibility.

</div>

# Appendices

<div class="appendices">

</div>
