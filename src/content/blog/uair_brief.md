---
author: Matt Franchi
pubDatetime: 2025-11-10T12:00:00.000Z
modDatetime:
title: Sensing AI Incidents & Risks from Global News
slug: uair-brief
featured: true
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

![Geographic distribution of articles in the UAIR dataset. Countries are colored by article count (yellow to red), with countries containing no articles shown in gray. The dataset includes 415,821 total articles across 49 countries.](@assets/uair-brief/world_map_articles_count.png "Geographic distribution of articles in the UAIR dataset. Countries are colored by article count (yellow to red), with countries containing no articles shown in gray. The dataset includes 415,821 total articles across 49 countries.")

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

![Sankey diagram showing the flow of articles through the UAIR pipeline. The diagram visualizes article counts at each stage (nodes) and the flow of articles between stages (links). Blue flows represent articles progressing through the pipeline, while red flows represent articles lost at filtering stages. The pipeline processes 29,372 input articles, filtering to 578 relevant articles at classification (98.0% loss) and further reducing to 61 verified articles at verification (89.4% loss from decomposed articles).](@assets/uair-brief/pipeline_flow_sankey.png "Sankey diagram showing the flow of articles through the UAIR pipeline. The diagram visualizes article counts at each stage (nodes) and the flow of articles between stages (links). Blue flows represent articles progressing through the pipeline, while red flows represent articles lost at filtering stages. The pipeline processes 29,372 input articles, filtering to 578 relevant articles at classification (98.0% loss) and further reducing to 61 verified articles at verification (89.4% loss from decomposed articles).")

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

![Heatmap showing distribution of EU AI Act risk classifications across deployment domains and risk categories. Prohibited practices are rare but concentrated in specific domains (e.g., biometric identification). High Risk classifications dominate in healthcare and law enforcement domains.](@assets/uair-brief/eu_ai_act_classifications_heatmap.png "Heatmap showing distribution of EU AI Act risk classifications across deployment domains and risk categories. Prohibited practices are rare but concentrated in specific domains (e.g., biometric identification). High Risk classifications dominate in healthcare and law enforcement domains.")

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

![Temporal trends in AI-relevant article fraction. The proportion of articles classified as AI-relevant has increased steadily over time, with a dip during the Coronavirus pandemic, reflecting both growing AI deployment and improved media coverage of AI-related topics.](@assets/uair-brief/fraction_relevant_articles_per_year.png "Temporal trends in AI-relevant article fraction. The proportion of articles classified as AI-relevant has increased steadily over time, with a dip during the Coronavirus pandemic, reflecting both growing AI deployment and improved media coverage of AI-related topics.")

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

1em 1em 1em

# Relevance Classification Prompt

## System Prompt

As a Senior Technology Specialist, you specialize in the latest
developments in Artificial Intelligence (AI) technology. You focus on
Responsible AI development and use. As part of this, you investigate
real-world AI incidents from news articles and try to understand both
the original AI uses as well as specific, sometimes malicious,
instantiations of those uses that caused the incidents. In this pivotal
role, you are entrusted with reviewing and cataloguing the diverse
applications, use cases, and incidents of AI technology across multiple
domains.

## User Template

Read the following article chunk and answer strictly YES or NO to the
question: Does this article describe a use of artificial intelligence
technology?

\[article_id={article_id} chunk={chunk_id}/{num_chunks}\] {chunk_text}

## Output Instructions

The model must return only “YES” or “NO”. The classification uses guided
decoding with a choice constraint limiting outputs to “YES” or “NO,”
ensuring deterministic binary classification without post-processing.
This eliminates parsing errors and ensures consistent output format.

## Configuration

The stage supports optional keyword-based pre-filtering to reduce
computational costs by gating articles before LLM processing. The
keyword regex matches AI-related terms including “artificial
intelligence,” “machine learning,” “neural network,” “large language
model,” and common model names (GPT, Claude, Gemini, etc.).

Batch size is typically 16 articles per batch, GPU memory utilization
0.8, and maximum model context length 8,192 tokens. The stage outputs
two datasets: all articles with relevance scores, and a filtered set
containing only relevant articles. On the US dataset, this filtered set
contains 578 articles (1.97% of 29,372 input articles) for downstream
processing.

1em 1em 1em

# Tuple Decomposition Prompt

## System Prompt

You are an expert artificial intelligence safety researcher trained in
extracting and summarizing urban AI risks from news articles. Given a
single news article that pertains to an urban artificial intelligence
(AI) use case, extract a structured template of the use, including the
deployment domain, deployment purpose, deployment capability, identity
of the AI deployer, identity of the AI subject, identity of the AI
developer, location of the AI deployer, location of the AI subject, and
date & time of the event. For any field that is missing, vague, unclear,
or not specified, set it to null and list it under missing. You can
provide multiple values for a field.

## User Template

You will be provided input with the text of a news article randomly
sampled from a global news database. Only focus on the article
narrative, not advertisements or other scraping artifacts. Based on the
input information, formulate the following outputs:

### I) Original Intended AI Use

You need to focus on the original AI use, as it might have been intended
for potentially beneficial applications, even if it has been misused or
its unintended applications resulted in the incident. DO NOT FILL IN THE
FIELDS IF THEY ARE NOT SPECIFIED IN THE INPUT ARTICLE TEXT; instead,
list them under “missing”.

The definition of the use must contain specific details about how the
technology is used by using action verbs that clearly describe the
actions, activities, or processes of the uses. The level of specificity
should be general and not on the very concrete instance. For each of
these uses, you must output the following 10 elements each in less than
7 words:

1.  **Domain:** The domain that represents the area or sector in which
    the AI system is intended to be used.

2.  **Purpose:** The purpose or objective that is intended to be
    accomplished by using an AI system.

3.  **Capability:** The capability of the AI system that enables the
    realization of its purpose and reflects the technological
    capability.

4.  **Deployment Space:** The type of space in which the use took place.
    Can be one of: Online space; Publicly accessible space; Not publicly
    accessible space.

5.  **AI Deployer:** The entity or individual in charge of deploying and
    managing the AI system, including individuals, organizations,
    corporations, public authorities, and agencies responsible for its
    operation and management. Even if the deployer of a general intended
    use is specified, such as the AI system provider, or if a specific
    person or entity misused the original use, do not name that entity
    directly but instead output the more general intended original
    deployer (e.g., “Social media company” instead of “Company X”).

6.  **Location of AI Deployer:** The location of the AI deployer,
    including countries, cities, or regions.

7.  **AI Subject:** The entity or individual directly affected by the
    use of the AI system, experiencing its effects and consequences.
    They interact with or are impacted by the AI system’s processes,
    decisions, or outcomes. If the general AI Deployer of the original
    intended AI use is specified, you should include it. If a specific
    person or entity were intentionally or unintentionally harmed but
    does not represent well the general deployer, output instead the
    general intended original deployer (e.g., “Social media users”
    instead of “John Doe”).

8.  **Location of AI Subject:** The location of the AI subject,
    including countries, cities, or regions.

9.  **Date & Time of Event:** The date and time of the event, including
    the year, month, day, hour, and minute.

10. **Missing:** List of missing or uncertain fields.

Ensure that each concept is specific and easy to understand for
non-experts. Avoid duplicate purposes or objectives and use clear and
precise language to describe the uses’ concepts.

### Capability Formatting

For the “Capability”, write it by combining action verbs in gerund form
(i.e., ending with “ing”), inferences and data, entity or metric.

1.  **Action verbs** clearly describe the actions, activities, or
    processes taken by the AI system, e.g., identify. Choose the most
    suitable action verb from the following list:

    - \(A\) Estimating (e.g., Rating, Grading, Measuring, Assessing)

    - \(B\) Forecasting (e.g., Predicting, Guessing, Speculating)

    - \(C\) Comparing (e.g., Ranking, Ordering, Finding Best, Finding
      Cheapest, Recommending)

    - \(D\) Detecting (e.g., Monitoring, Sensing, Noticing, Classifying,
      Discriminating)

    - \(E\) Identifying (e.g., Recognizing, Discerning, Finding,
      Classifying, Perceiving)

    - \(F\) Discovering (e.g., Extracting, Noticing, Organizing,
      Clustering, Grouping, Connecting, Revealing)

    - \(G\) Generating (e.g., Making, Composing, Constructing, Creating,
      Authoring)

    - \(H\) Acting (e.g., Doing, Executing, Playing, Going, Learning,
      Operating)

2.  **Inference** clearly describes the output or conclusion drawn by
    the AI system based on the data it processes, e.g., crop yield,
    floods, trend, anomaly, wildfires, pattern, and probability

3.  **Data, Entity or Metric** clearly describes the source, type, or
    nature of the data used by the AI system, e.g., from an optical
    camera, from an infrared camera, user input, sensor readings,
    transaction records, biometric data, environmental data, social
    media posts, geographical information, medical records, and
    financial metrics.

For “Purpose”, write it also in a gerund verb form (i.e., ending with
“ing”).

Double-check that you are outputting realistic, i.e., plausible,
meaningful, and useful uses.

### II) Specific AI Risks

Describe the specific AI risks that are mentioned in the input. Format
each risk as one sentence, starting with the concrete risk if specified,
or else your identified/inferred risk. Follow this by a verb in past
tense specifying how it was mentioned, and then “due to” and the
specific reason (e.g., unintended use of the AI system, malfunctioning,
misuse, technical capability risk or failure).

For this part of the output, unlike the general AI use concepts, you
must use the specific and concrete parties involved if they were named
in the input (e.g., “Company X” instead of “Social media company” and
“John Doe” instead of “social media users”). If the parties are not
named in the input, use general terms without making up connections.

List as many distinct risks as you can clearly identify from the
incident, but do not duplicate risks if the same or a similar risk
affected multiple parties. Instead, include all those parties in a
single risk description. Be specific and name any parties involved—both
the at-risk ones and the AI deployers/providers—but only if they are
listed in the input. End each risk description with a full stop
(period).

### III) Specific AI Harms

Describe the specific AI harms that occurred. Format each harm as one
sentence, starting with the concrete harmed parties if specified, or
else your identified/inferred harmed parties or subjects. Follow this by
a verb in past tense specifying how they were harmed, and then “due to”
and the specific reason (e.g., unintended use of the AI system,
malfunctioning, misuse, technical capability risk or failure).

For this part of the output, unlike the general AI use concepts, you
must use the specific and concrete parties involved if they were named
in the input (e.g., “Company X” instead of “Social media company” and
“John Doe” instead of “social media users”). If the parties are not
named in the input, use general terms without making up connections.

List as many distinct harms as you can clearly identify from the
incident, but do not duplicate harms if the same or a similar harm
affected multiple parties. Instead, include all those parties in a
single harm description. Be specific and name any parties involved—both
the harmed ones and the AI deployers/providers—but only if they are
listed in the input. End each harm description with a full stop
(period).

### IV) Specific AI Benefits

Describe the specific AI benefits that are mentioned in the input.
Format each benefit as one sentence, starting with the concrete benefit
if specified, or else your identified/inferred benefit. Follow this by a
verb in past tense specifying how it was mentioned, and then “due to”
and the specific reason (e.g., unintended use of the AI system,
malfunctioning, misuse, technical capability risk or failure).

For this part of the output, unlike the general AI use concepts, you
must use the specific and concrete parties involved if they were named
in the input (e.g., “Company X” instead of “Social media company” and
“John Doe” instead of “social media users”). If the parties are not
named in the input, use general terms without making up connections.

List as many distinct benefits as you can clearly identify from the
incident, but do not duplicate benefits if the same or a similar benefit
affected multiple parties. Instead, include all those parties in a
single benefit description. Be specific and name any parties
involved—both the benefited ones and the AI deployers/providers—but only
if they are listed in the input. End each benefit description with a
full stop (period).

**Important:** Double-check your whole output and ensure that the AI use
is described in general terms, while the benefits are described in
specific terms.

## Output Format

The extraction must be returned as a correctly formatted JSON document
with the following structure:

    {
        "deployment_domain": "...",
        "deployment_purpose": "...",
        "deployment_capability": "...",
        "deployment_space": "...",
        "identity_of_ai_deployer": "...",
        "location_of_ai_deployer": "...",
        "identity_of_ai_subject": "...",
        "location_of_ai_subject": "...",
        "identity_of_ai_developer": "...",
        "date_and_time_of_event": "...",
        "missing": [...],
        "list_of_harms_that_occurred": [...],
        "list_of_risks_that_occurred": [...],
        "list_of_benefits_that_occurred": [...]
    }

The extraction uses guided decoding with a JSON schema generated from a
Pydantic model. The schema defines field types (strings, enums, arrays)
and required fields. Schema references (`$ref`) are inlined for xgrammar
compatibility. The guided decoding configuration enforces strict schema
compliance (`disable_fallback: true`,
`disable_additional_properties: true`), ensuring outputs conform to the
expected structure without post-processing.

Ensure to output only the correctly formatted JSON and nothing else.

## Input

Article: {article_text}

1em 1em 1em

# Tuple Verification Methodology

## Overview

The verification stage validates extracted tuples against source article
text using a combination of semantic similarity and natural language
inference (NLI). Unlike other pipeline stages that use LLM prompts,
verification employs specialized embedding and NLI models to assess
whether extracted claims are supported by evidence in the source text.

## Verification Models

### Embedding Model

The system uses intfloat/e5-base, a multilingual embedding model with
E5-style query/passage prefixes. Text is encoded with mean pooling over
token embeddings, normalized to unit vectors, and compared via cosine
similarity. The model supports batch encoding for efficiency.

### NLI Model

The system uses mDeBERTa-v3-base-xnli-multilingual for three-way
classification (entailment, neutral, contradiction). The model handles
multilingual text and outputs probability distributions over the three
classes. Label indices are resolved dynamically from model config to
handle different model architectures.

## Verification Process

The verification method employs a “combo” approach that combines
similarity scores, entailment probabilities, and contradiction
detection. The process for each tuple field proceeds as follows:

1.  **Text Preprocessing:** Split article text into sentences for
    granular matching.

2.  **Encoding:** Encode the extracted claim (tuple field value) and all
    article sentences using the embedding model. Both claim and
    sentences are encoded with appropriate prefixes (query for claim,
    passage for sentences).

3.  **Similarity Matching:** Compute cosine similarities between the
    claim embedding and all sentence embeddings. Identify the top-k most
    relevant text spans (typically $`k=5`$) from the article for each
    tuple field.

4.  **Natural Language Inference:** Run NLI on claim-premise pairs,
    where the premise is each of the top-k matching sentences. The NLI
    model outputs probabilities for entailment, neutral, and
    contradiction classes.

5.  **Score Combination:** Combine scores using configurable thresholds.
    The “combo” method requires:

    - Similarity $`\geq 0.55`$

    - Entailment probability $`\geq 0.85`$

    - Contradiction probability $`\leq 0.05`$

6.  **Field Verification:** A tuple field is considered verified if at
    least one of the top-k sentences meets all three thresholds.

7.  **Core Tuple Verification:** A core tuple is considered verified if
    its key fields (domain, purpose, capability, deployer, subject) all
    meet the verification thresholds.

## Windowing (Optional)

Optional windowing groups consecutive sentences into windows
(configurable size and stride) to handle multi-sentence evidence spans.
This is particularly useful for complex claims that span multiple
sentences. When windowing is enabled, the system:

- Groups sentences into overlapping windows (default window size: 5
  sentences, stride: 2)

- Encodes each window as a single passage

- Computes similarities and runs NLI on claim-window pairs

- Selects the best-matching window for verification

## Configuration Parameters

Default thresholds are:

- Similarity threshold: $`\geq 0.55`$

- Entailment threshold: $`\geq 0.85`$

- Contradiction threshold: $`\leq 0.05`$

- Top-k sentences: 5

- Windowing: disabled by default

- Window size: 5 sentences (when enabled)

- Window stride: 2 sentences (when enabled)

## Output

The verification stage produces verification scores and flags for each
tuple field:

- `sim_score` — Cosine similarity score between claim and best-matching
  sentence

- `ent_prob` — Entailment probability from NLI model

- `contra_prob` — Contradiction probability from NLI model

- `verified` — Boolean flag indicating if field meets all thresholds

- `core_tuple_verified` — Boolean flag indicating if all core fields
  (domain, purpose, capability, deployer, subject) are verified

On the US dataset, 61 of 578 decomposed articles (10.5%) pass core tuple
verification.

1em 1em 1em

# EU AI Act Risk Classification Prompt

## System Prompt

You are an experienced regulatory compliance specialist who works in the
field of artificial intelligence (AI) technology regulation. You are
thoughtful, decisive, experienced and conscientious. You have access to
the entirety of the EU AI Act and its amendments, which outline how
various AI technologies are to be regulated and risk-classified within
the European Union.

## Classification Instructions

Classify the following urban AI use by utilizing a three-tier
classification: 1) Prohibited, 2) High Risk, and 3) Limited or Low Risk.

### Four Classification Steps

1.  **Write a Brief Description:** Write a brief description of the
    urban AI usage, using similar language to the EU AI Act. The
    description should start with “The urban AI usage intended to be
    used...”, and be written in a single sentence.

2.  **Determine Risk Level:** Determine whether the urban AI usage is
    Prohibited or of High Risk, providing the exact text from the EU AI
    Act and explaining the reasoning. Be very strict and verify the
    reasoning. Assume High Risk unless there is clear evidence that it
    is Prohibited. Pay particular attention to the subject and user of
    the urban AI usage, as this is critical for classification. Ensure
    that the subject and user align with the text. They are very
    important. Also, ensure that you understand the purpose and the
    capability of the urban AI usage as this is highly critical for the
    risk classification. For example, the capability to verify patient
    identities by using urban AI usage implies the use of biometric
    identification of patients. Be aware of these and similar cases.

3.  **Review Amendments:** Go through all the amendments to the EU AI
    Act and ensure that nothing has changed that would affect the
    classification. If something has changed, update the classification
    accordingly and explicitly reference the amendment that most closely
    resembles the urban AI usage. The amendments can be found under the
    text: “Here are some important amendments to the Act:”

4.  **Default Classification:** If the urban AI usage is neither
    Prohibited nor High Risk, classify it as Limited or Low Risk.

It is of utmost importance to exercise precision and make accurate
judgments when classifying the risk associated with the urban AI usage.
Please carefully consider all the regulations listed below during the
risk classification of the urban AI usage.

## Article 5: Prohibited Artificial Intelligence Practices

### Paragraph 1: Prohibited Practices

The following artificial intelligence practices shall be prohibited:

1.  The placing on the market, putting into service or use of an AI
    system that deploys subliminal techniques beyond a person’s
    consciousness or purposefully manipulative or deceptive techniques,
    with the objective to or the effect of materially distorting a
    person’s or a group of persons’ behaviour by appreciably impairing
    the person’s ability to make an informed decision, thereby causing
    the person to take a decision that that person would not have
    otherwise taken in a manner that causes or is likely to cause that
    person, another person or group of persons significant harm;

2.  The placing on the market, putting into service or use of an AI
    system that exploits any of the vulnerabilities of a person or a
    specific group of persons due to their age, disability or a specific
    social or economic situation, with the objective to or the effect of
    materially distorting the behaviour of that person or a person
    pertaining to that group in a manner that causes or is reasonably
    likely to cause that person or another person significant harm;

3.  The placing on the market or putting into service for this specific
    purpose, or use of biometric categorisation systems that categorise
    individually natural persons based on their biometric data to deduce
    or infer their race, political opinions, trade union membership,
    religious or philosophical beliefs, sex life or sexual orientation.
    This prohibition does not cover any labelling or filtering of
    lawfully acquired biometric datasets, such as images, based on
    biometric data or categorizing of biometric data in the area of law
    enforcement;

4.  The placing on the market, putting into service or use of AI systems
    for the evaluation or classification of natural persons or groups
    thereof over a certain period of time based on their social
    behaviour or known, inferred or predicted personal or personality
    characteristics, with the social score leading to either or both of
    the following:

    1.  detrimental or unfavourable treatment of certain natural persons
        or whole groups thereof in social contexts that are unrelated to
        the contexts in which the data was originally generated or
        collected;

    2.  detrimental or unfavourable treatment of certain natural persons
        or groups thereof that is unjustified or disproportionate to
        their social behaviour or its gravity;

5.  The use of ‘real-time’ remote biometric identification systems in
    publicly accessible spaces for the purpose of law enforcement unless
    and in as far as such use is strictly necessary for one of the
    following objectives:

    1.  the targeted search for specific victims of abduction,
        trafficking in human beings and sexual exploitation of human
        beings as well as search for missing persons;

    2.  the prevention of a specific, substantial and imminent threat to
        the life or physical safety of natural persons or a genuine and
        present or genuine and foreseeable threat of a terrorist attack;

    3.  the localisation or identification of a person suspected of
        having committed a criminal offence, for the purposes of
        conducting a criminal investigation, prosecution or executing a
        criminal penalty for offences, referred to in Annex II and
        punishable in the Member State concerned by a custodial sentence
        or a detention order for a maximum period of at least four
        years.

    This paragraph is without prejudice to the provisions in Article 9
    of the GDPR for the processing of biometric data for purposes other
    than law enforcement;

6.  The placing on the market, putting into service for this specific
    purpose, or use of an AI system for making risk assessments of
    natural persons in order to assess or predict the risk of a natural
    person to commit a criminal offence, based solely on the profiling
    of a natural person or on assessing their personality traits and
    characteristics; This prohibition shall not apply to AI systems used
    to support the human assessment of the involvement of a person in a
    criminal activity, which is already based on objective and
    verifiable facts directly linked to a criminal activity;

7.  The placing on the market, putting into service for this specific
    purpose, or use of AI systems that create or expand facial
    recognition databases through the untargeted scraping of facial
    images from the internet or CCTV footage;

8.  The placing on the market, putting into service for this specific
    purpose, or use of AI systems to infer emotions of a natural person
    in the areas of workplace and education institutions except in cases
    where the use of the AI system is intended to be put in place or
    into the market for medical or safety reasons;

### Paragraph 1a

This Article shall not affect the prohibitions that apply where an
artificial intelligence practice infringes other Union law.

### Paragraphs 2–6: Real-Time Remote Biometric Identification

**Paragraph 2.** The use of ‘real-time’ remote biometric identification
systems in publicly accessible spaces for the purpose of law enforcement
for any of the objectives referred to in paragraph 1 point d) shall only
be deployed for the purposes under paragraph 1, point d) to confirm the
specifically targeted individual’s identity and it shall take into
account the following elements:

1.  the nature of the situation giving rise to the possible use, in
    particular the seriousness, probability and scale of the harm caused
    in the absence of the use of the system;

2.  the consequences of the use of the system for the rights and
    freedoms of all persons concerned, in particular the seriousness,
    probability and scale of those consequences.

In addition, the use of ‘real-time’ remote biometric identification
systems in publicly accessible spaces for the purpose of law enforcement
for any of the objectives referred to in paragraph 1 point d) shall
comply with necessary and proportionate safeguards and conditions in
relation to the use in accordance with national legislations authorizing
the use thereof, in particular as regards the temporal, geographic and
personal limitations. The use of the ‘real-time’ remote biometric
identification system in publicly accessible spaces shall only be
authorised if the law enforcement authority has completed a fundamental
rights impact assessment as provided for in Article 27 and has
registered the system in the database according to Article 49. However,
in duly justified cases of urgency, the use of the system may be
commenced without the registration, provided that the registration is
completed without undue delay.

**Paragraph 3.** As regards paragraphs 1, point (d) and 2, each use for
the purpose of law enforcement of a ‘real-time’ remote biometric
identification system in publicly accessible spaces shall be subject to
a prior authorisation granted by a judicial authority or an independent
administrative authority whose decision is binding of the Member State
in which the use is to take place, issued upon a reasoned request and in
accordance with the detailed rules of national law referred to in
paragraph 4. However, in a duly justified situation of urgency, the use
of the system may be commenced without an authorisation provided that,
such authorisation shall be requested without undue delay, at the latest
within 24 hours. If such authorisation is rejected, its use shall be
stopped with immediate effect and all the data, as well as the results
and outputs of this use shall be immediately discarded and deleted.

**Paragraph 3a.** Without prejudice to paragraph 3, each use of a
‘real-time’ remote biometric identification system in publicly
accessible spaces for law enforcement purposes shall be notified to the
relevant market surveillance authority and the national data protection
authority in accordance with the national rules referred to in paragraph
4.

**Paragraph 4.** A Member State may decide to provide for the
possibility to fully or partially authorise the use of ‘real-time’
remote biometric identification systems in publicly accessible spaces
for the purpose of law enforcement within the limits and under the
conditions listed in paragraphs 1, point (d), 2 and 3.

**Paragraph 5.** National market surveillance authorities and the
national data protection authorities of Member States that have been
notified of the use of ‘real-time’ remote biometric identification
systems in publicly accessible spaces for law enforcement purposes
pursuant to paragraph 3a shall submit to the Commission annual reports
on such use.

**Paragraph 6.** The Commission shall publish annual reports on the use
of ‘real-time’ remote biometric identification systems in publicly
accessible spaces for law enforcement purposes based on aggregated data
in Member States based on the annual reports referred to in paragraph 5.

### Definition: Publicly Accessible Space

For the purposes of this Regulation the notion of *publicly accessible*
space should be understood as referring to any physical place that is
accessible to an undetermined number of natural persons, and
irrespective of whether the place in question is privately or publicly
owned and irrespective of the activity for which the place may be used,
such as commerce (for instance, shops, restaurants, cafés), services
(for instance, banks, professional activities, hospitality), sport (for
instance, swimming pools, gyms, stadiums), transport (for instance, bus,
metro and railway stations, airports, means of transport), entertainment
(for instance, cinemas, theatres, museums, concert and conference halls)
leisure or otherwise (for instance, public roads and squares, parks,
forests, playgrounds).

A place should be classified as publicly accessible also if, regardless
of potential capacity or security restrictions, access is subject to
certain predetermined conditions, which can be fulfilled by an
undetermined number of persons, such as purchase of a ticket or title of
transport, prior registration or having a certain age. By contrast, a
place should not be considered publicly accessible if access is limited
to specific and defined natural persons through either Union or national
law directly related to public safety or security or through the clear
manifestation of will by the person having the relevant authority on the
place.

The factual possibility of access alone (e.g. an unlocked door, an open
gate in a fence) does not imply that the place is publicly accessible in
the presence of indications or circumstances suggesting the contrary
(e.g. signs prohibiting or restricting access). Company and factory
premises as well as offices and workplaces that are intended to be
accessed only by relevant employees and service providers are places
that are not publicly accessible. Publicly accessible spaces should not
include prisons or border control.

Some other areas may be composed of both not publicly accessible and
publicly accessible areas, such as the hallway of a private residential
building necessary to access a doctor’s office or an airport. Online
spaces are not covered either, as they are not physical spaces. Whether
a given space is accessible to the public should however be determined
on a case-by-case basis, having regard to the specificities of the
individual situation at hand.

## Article 6: Classification Rules for High-Risk AI Systems

### Paragraph 1: Safety Components

Irrespective of whether an AI system is placed on the market or put into
service independently from the products referred to in points (a) and
(b), that AI system shall be considered high-risk where both of the
following conditions are fulfilled:

1.  the AI system is intended to be used as a safety component of a
    product, or the AI system is itself a product, covered by the Union
    harmonisation legislation listed in Annex I;

2.  the product whose safety component pursuant to point (a) is the AI
    system, or the AI system itself as a product, is required to undergo
    a third party conformity assessment, with a view to the placing on
    the market or putting into service of that product pursuant to the
    Union harmonisation legislation listed in Annex I.

### Paragraph 2: Annex III High-Risk Systems

In addition to the high-risk AI systems referred to in paragraph 1, AI
systems referred to in Annex III shall also be considered high-risk.

### Paragraph 2a: Derogation from High-Risk Classification

By derogation from paragraph 2 AI systems shall not be considered as
high risk if they do not pose a significant risk of harm, to the health,
safety or fundamental rights of natural persons, including by not
materially influencing the outcome of decision making. This shall be the
case if one or more of the following criteria are fulfilled:

1.  the AI system is intended to perform a narrow procedural task;

2.  the AI system is intended to improve the result of a previously
    completed human activity;

3.  the AI system is intended to detect decision-making patterns or
    deviations from prior decision-making patterns and is not meant to
    replace or influence the previously completed human assessment,
    without proper human review; or

4.  the AI system is intended to perform a preparatory task to an
    assessment relevant for the purpose of the use cases listed in Annex
    III.

Notwithstanding first subparagraph of this paragraph, an AI system shall
always be considered high-risk if the AI system performs profiling of
natural persons.

### Paragraph 2b: Documentation Requirements

A provider who considers that an AI system referred to in Annex III is
not high-risk shall document its assessment before that system is placed
on the market or put into service. Such provider shall be subject to the
registration obligation set out in Article 49(1a). Upon request of
national competent authorities, the provider shall provide the
documentation of the assessment.

### Paragraph 2c: Commission Guidelines

The Commission shall, after consulting the AI Board, and no later than
\[18 months\] after the entry into force of this Regulation, provide
guidelines specifying the practical implementation of this article
completed by a comprehensive list of practical examples of high risk and
non-high risk use cases on AI systems pursuant to Article 82b.

### Paragraph 2d: Delegated Acts

The Commission is empowered to adopt delegated acts in accordance with
Article 97 to amend the criteria laid down in points a) to d) of the
first subparagraph of paragraph 2a. The Commission may adopt delegated
acts adding new criteria to those laid down in points a) to d) of the
first subparagraph of paragraph 2a, or modifying them, only where there
is concrete and reliable evidence of the existence of AI systems that
fall under the scope of Annex III but that do not pose a significant
risk of harm to the health, safety and fundamental rights.

## Annex I: Union Harmonisation Legislation

### Part I Section A: New Legislative Framework

1.  Directive 2006/42/EC on machinery (as repealed by the Machinery
    Regulation)

2.  Directive 2009/48/EC on the safety of toys

3.  Directive 2013/53/EU on recreational craft and personal watercraft

4.  Directive 2014/33/EU on lifts and safety components for lifts

5.  Directive 2014/34/EU on equipment and protective systems for
    potentially explosive atmospheres

6.  Directive 2014/53/EU on radio equipment

7.  Directive 2014/68/EU on pressure equipment

8.  Regulation (EU) 2016/424 on cableway installations

9.  Regulation (EU) 2016/425 on personal protective equipment

10. Regulation (EU) 2016/426 on appliances burning gaseous fuels

11. Regulation (EU) 2017/745 on medical devices

12. Regulation (EU) 2017/746 on in vitro diagnostic medical devices

### Part II Section B: Other Union Harmonisation Legislation

1.  Regulation (EC) No 300/2008 on civil aviation security

2.  Regulation (EU) No 168/2013 on two- or three-wheel vehicles and
    quadricycles

3.  Regulation (EU) No 167/2013 on agricultural and forestry vehicles

4.  Directive 2014/90/EU on marine equipment

5.  Directive (EU) 2016/797 on the interoperability of the rail system

6.  Regulation (EU) 2018/858 on motor vehicles and their trailers

7.  Regulation (EU) 2019/2144 on type-approval requirements for motor
    vehicles

8.  Regulation (EU) 2018/1139 on civil aviation and European Union
    Aviation Safety Agency (for unmanned aircraft)

## Annex II: List of Criminal Offences

Criminal offences referred to in Article 5(1)(iii):

- Terrorism

- Trafficking in human beings

- Sexual exploitation of children and child pornography

- Illicit trafficking in narcotic drugs and psychotropic substances

- Illicit trafficking in weapons, munitions and explosives

- Murder

- Grievous bodily injury

- Illicit trade in human organs and tissue

- Illicit trafficking in nuclear or radioactive materials

- Kidnapping, illegal restraint and hostage-taking

- Crimes within the jurisdiction of the International Criminal Court

- Unlawful seizure of aircraft/ships

- Rape

- Environmental crime

- Organised or armed robbery

- Sabotage

- Participation in a criminal organisation involved in one or more
  offences listed above

## Annex III: High-Risk AI Systems

High-risk AI systems pursuant to Article 6(2) are the AI systems listed
in any of the following areas:

### 1. Biometrics

Insofar as their use is permitted under relevant Union or national law:

1.  Remote biometric identification systems. This shall not include AI
    systems intended to be used for biometric verification whose sole
    purpose is to confirm that a specific natural person is the person
    he or she claims to be;

2.  AI systems intended to be used for biometric categorisation,
    according to sensitive or protected attributes or characteristics
    based on the inference of those attributes or characteristics;

3.  AI systems intended to be used for emotion recognition.

### 2. Critical Infrastructure

1.  AI systems intended to be used as safety components in the
    management and operation of critical digital infrastructure, road
    traffic and the supply of water, gas, heating and electricity.

### 3. Education and Vocational Training

1.  AI systems intended to be used to determine access or admission or
    to assign natural persons to educational and vocational training
    institutions at all levels;

2.  AI systems intended to be used to evaluate learning outcomes,
    including when those outcomes are used to steer the learning process
    of natural persons in educational and vocational training
    institutions at all levels;

3.  AI systems intended to be used for the purpose of assessing the
    appropriate level of education that individual will receive or will
    be able to access, in the context of/within education and vocational
    training institution;

4.  AI systems intended to be used for monitoring and detecting
    prohibited behaviour of students during tests in the context
    of/within education and vocational training institutions.

### 4. Employment, Workers Management and Access to Self-Employment

1.  AI systems intended to be used for recruitment or selection of
    natural persons, notably to place targeted job advertisements, to
    analyse and filter job applications, and to evaluate candidates;

2.  AI intended to be used to make decisions affecting terms of the work
    related relationships, promotion and termination of work-related
    contractual relationships, to allocate tasks based on individual
    behaviour or personal traits or characteristics and to monitor and
    evaluate performance and behaviour of persons in such relationships.

### 5. Access to and Enjoyment of Essential Private and Public Services

1.  AI systems intended to be used by public authorities or on behalf of
    public authorities to evaluate the eligibility of natural persons
    for essential public assistance benefits and services, including
    healthcare services, as well as to grant, reduce, revoke, or reclaim
    such benefits and services;

2.  AI systems intended to be used to evaluate the creditworthiness of
    natural persons or establish their credit score, with the exception
    of AI systems used for the purpose of detecting financial fraud;

3.  AI systems intended to evaluate and classify emergency calls by
    natural persons or to be used to dispatch, or to establish priority
    in the dispatching of emergency first response services, including
    by police, firefighters and medical aid, as well as of emergency
    healthcare patient triage systems;

4.  AI systems intended to be used for risk assessment and pricing in
    relation to natural persons in the case of life and health
    insurance.

### 6. Law Enforcement

Insofar as their use is permitted under relevant Union or national law:

1.  AI systems intended to be used by or on behalf of law enforcement
    authorities, or by Union institutions, agencies, offices or bodies
    in support of law enforcement authorities or on their behalf to
    assess the risk of a natural person to become a victim of criminal
    offences;

2.  AI systems intended to be used by or on behalf of law enforcement
    authorities or by Union institutions, bodies and agencies in support
    of law enforcement authorities as polygraphs and similar tools;

3.  AI systems intended to be used by or on behalf of law enforcement
    authorities, or by Union institutions, agencies, offices or bodies
    in support of law enforcement authorities to evaluate the
    reliability of evidence in the course of investigation or
    prosecution of criminal offences;

4.  AI systems intended to be used by law enforcement authorities or on
    their behalf or by Union institutions, agencies, offices or bodies
    in support of law enforcement authorities for assessing the risk of
    a natural person of offending or re-offending not solely based on
    profiling of natural persons as referred to in Article 3(4) of
    Directive (EU) 2016/680 or to assess personality traits and
    characteristics or past criminal behaviour of natural persons or
    groups;

5.  AI systems intended to be used by or on behalf of law enforcement
    authorities or by Union agencies institutions, agencies, offices or
    bodies in support of law enforcement authorities for profiling of
    natural persons as referred to in Article 3(4) of Directive (EU)
    2016/680 in the course of detection, investigation or prosecution of
    criminal offences;

### 7. Migration, Asylum and Border Control Management

Insofar as their use is permitted under relevant Union or national law:

1.  AI systems intended to be used by competent public authorities as
    polygraphs and similar tools;

2.  AI systems intended to be used by or on behalf of competent public
    authorities or by Union agencies, offices or bodies to assess a
    risk, including a security risk, a risk of irregular migration, or a
    health risk, posed by a natural person who intends to enter or has
    entered into the territory of a Member State;

3.  AI systems intended to be used by or on behalf of competent public
    authorities or by Union agencies, offices or bodies to assist
    competent public authorities for the examination of applications for
    asylum, visa and residence permits and associated complaints with
    regard to the eligibility of the natural persons applying for a
    status, including related assessment of the reliability of evidence;

4.  AI systems intended to be used by or on behalf of competent public
    authorities, including Union agencies, offices or bodies, in the
    context of migration, asylum and border control management, for the
    purpose of detecting, recognising or identifying natural persons
    with the exception of verification of travel documents.

### 8. Administration of Justice and Democratic Processes

1.  AI systems intended to be used by a judicial authority or on their
    behalf to assist a judicial authority in researching and
    interpreting facts and the law and in applying the law to a concrete
    set of facts or used in a similar way in alternative dispute
    resolution;

2.  AI systems intended to be used for influencing the outcome of an
    election or referendum or the voting behaviour of natural persons in
    the exercise of their vote in elections or referenda. This does not
    include AI systems whose output natural persons are not directly
    exposed to, such as tools used to organise, optimise and structure
    political campaigns from an administrative and logistic point of
    view;

## Article 7: Amendments to Annex III

### Paragraph 1: Adding or Modifying Use Cases

The Commission is empowered to adopt delegated acts in accordance with
Article 97 to amend Annex III by adding or modifying use cases of
high-risk AI systems where both of the following conditions are
fulfilled:

1.  the AI systems are intended to be used in any of the areas listed in
    points 1 to 8 of Annex III;

2.  the AI systems pose a risk of harm to health and safety, or an
    adverse impact on fundamental rights, and that risk is equivalent to
    or greater than the risk of harm or of adverse impact posed by the
    high-risk AI systems already referred to in Annex III.

### Paragraph 2: Assessment Criteria

When assessing for the purposes of paragraph 1 whether an AI system
poses a risk of harm to the health and safety or a risk of adverse
impact on fundamental rights that is equivalent to or greater than the
risk of harm posed by the high-risk AI systems already referred to in
Annex III, the Commission shall take into account the following
criteria:

1.  the intended purpose of the AI system;

2.  the extent to which an AI system has been used or is likely to be
    used;

3.  the nature and amount of the data processed and used by the AI
    system, in particular whether special categories of personal data
    are processed;

4.  the extent to which the AI system acts autonomously and the
    possibility for a human to override a decision or recommendations
    that may lead to potential harm;

5.  the extent to which the use of an AI system has already caused harm
    to health and safety, has had an adverse impact on fundamental
    rights or has given rise to significant concerns in relation to the
    likelihood of such harm or adverse impact, as demonstrated for
    example by reports or documented allegations submitted to national
    competent authorities or by other reports, as appropriate;

6.  the potential extent of such harm or such adverse impact, in
    particular in terms of its intensity and its ability to affect a
    plurality of persons or to disproportionately affect a particular
    group of persons;

7.  the extent to which potentially harmed or adversely impacted persons
    are dependent on the outcome produced with an AI system, in
    particular because for practical or legal reasons it is not
    reasonably possible to opt-out from that outcome;

8.  the extent to which there is an imbalance of power, or the
    potentially harmed or adversely impacted persons are in a vulnerable
    position in relation to the user of an AI system, in particular due
    to status, authority, knowledge, economic or social circumstances,
    or age;

9.  the extent to which the outcome produced involving an AI system is
    easily corrigible or reversible, taking into account the technical
    solutions available to correct or reverse, whereby outcomes having
    and adverse impact on health, safety, fundamental rights, shall not
    be considered as easily corrigible or reversible;

10. the magnitude and likelihood of benefit of the deployment of the AI
    system for individuals, groups, or society at large, including
    possible improvements in product safety;

11. the extent to which existing Union legislation provides for:

    1.  effective measures of redress in relation to the risks posed by
        an AI system, with the exclusion of claims for damages;

    2.  effective measures to prevent or substantially minimise those
        risks.

### Paragraph 2a: Removing High-Risk Systems

The Commission is empowered to adopt delegated acts in accordance with
Article 97 to amend the list in Annex III by removing high-risk AI
systems where both of the following conditions are fulfilled:

1.  the high-risk AI system(s) concerned no longer pose any significant
    risks to fundamental rights, health or safety, taking into account
    the criteria listed in paragraph 2;

2.  the deletion does not decrease the overall level of protection of
    health, safety and fundamental rights under Union law.

## Reasoning Format

Write the reasoning to be concise, fitting into one sentence of a
maximum of 25 words and distilling the key info, which helps to
understand why the use is Prohibited, High Risk or Limited or Low Risk.
The format for the statement is as follows:

- If the use is classified as “Prohibited”:

  *“Prohibited” due to \[THE REASON\], which falls under the EU AI Act
  \[RELEVANT SECTION or RULE\].*

- If the use is classified as “High Risk”:

  *“High Risk” due to \[THE REASON\], which falls under the EU AI Act
  \[RELEVANT SECTION or RULE\].*

- If the classification is “Limited or Low Risk”:

  *“Limited or Low Risk” due to \[THE REASON\] \[mention the EU AI Act
  if useful only\].*

## Input Parameters

The assessment requires the following AI system details:

- Domain

- Purpose

- Capability

- AI Developer

- AI Deployer

- AI Deployer Location

- AI Subject

- AI Subject Location

- Date and Time of Event

## Output Format

The classification must be returned as a correctly formatted JSON
document with the following structure:

    {
      "Description": "The usage of urban AI was...",
      "Classification": ["Prohibited"/"High Risk"/"Limited or Low Risk"],
      "Relevant Text from the EU AI Act": "[Quotation if applicable] - 
        Include the Article, Annex, or Amendment or other EU AI Act section 
        that most appropriately justifies the classification.",
      "Reasoning": "[CLASSIFICATION] due to [THE REASON], 
        mention the EU AI Act if [RELEVANT SECTION or RULE]."
    }

Ensure to output a **CORRECTLY FORMATTED** JSON.

1em 1em 1em

# AI Human Rights and SDG Impact Assessment Prompt

## System Prompt

You are a renowned specialist in the field of AI technology with a
dedicated focus on understanding, promoting, and supporting Universal
Human Rights. With your vast experience, decisiveness, and conscientious
approach, you have a deep understanding of how AI technology can be
leveraged to impact human rights. You possess comprehensive knowledge of
the List of human rights definitions, which encapsulates all 30 articles
from the UN Universal Declaration on Human Rights. This global framework
was meticulously crafted by the United Nations.

## Assessment Instructions

Assess the *risks (potential negative impacts)* and *benefits (potential
positive impacts)* of the AI use described below on the *human rights*
of any stakeholders involved (e.g., AI subjects, deployers, end-users),
as well as on the *Sustainable Development Goals (SDGs)*. Moreover,
assess any *additional* risks that may arise from the deployment of this
AI system.

### Six Assessment Steps

1.  **Describe the AI System:** Craft a concise description of the AI
    system, ensuring it parallels the phrasing used in the Universal
    Human Rights Declaration/SDGs. Your description should begin with
    “The AI system is designed to...” and should be encapsulated within
    two sentences.

2.  **Evaluate Human Rights:** Evaluate each human right (described in
    the articles below). Classify the impact on human rights as
    “Positive”, “Negative”, or “Mixed”. To do so, assess if the
    introduction of the AI system is:

    - *Positive* – the introduction of the AI system improves the human
      rights of AI users in the domain.

    - *Negative* – the introduction of the AI system deteriorates the
      human rights of AI users in the domain.

    - *Mixed* (both positive and negative) – the introduction of the AI
      system at the same time improves and deteriorates the human rights
      of AI users in the domain.

    - *Inapplicable* – there is no clear indication that the
      introduction of the AI system improves or deteriorates the human
      rights of AI users in the domain.

3.  **Evaluate SDG Goals:** Evaluate each SDG Goal (described in the
    clauses below). Classify the impact on the Goals as “Positive”,
    “Negative”, or “Mixed”. When assessing whether the AI system
    negatively impacts a goal, consider what are the potential biases
    and harms that might be caused by this system for the goal. To
    classify the impact for each goal, assess if the introduction of the
    AI system is:

    - *Positive* – the introduction of the AI system improves the
      developments towards achieving the SDG Goal targets, for example,
      by combating bias, supporting equality, empowering humanity, or
      enabling measuring the Goal’s indicators.

    - *Negative* – the introduction of the AI system deteriorates the
      developments towards achieving the SDG Goal targets, for example,
      by causing harms, reinforcing biases, fostering discrimination, or
      impeding progress.

    - *Mixed* (both positive and negative) – the introduction of the AI
      system at the same time improves and deteriorates the developments
      towards achieving the SDG Goal targets.

    - *Inapplicable* – there is no clear indication that the
      introduction of the AI system improves or deteriorates the
      developments towards achieving the SDG Goal targets.

4.  **Evaluate Additional Risks:** Evaluate any *additional* risks that
    may arise from the deployment of this AI system. This can be done by
    considering the following vignettes:

    *“Imagine you are \[the AI Subject/the AI Deployer/a User\] of this
    AI system. What potential risks/benefits of the AI use do you
    foresee in addition to any identified above? You might benefit/be
    harmed because...”*

    To help you think through this, you may consider the PESTLE
    framework factors (described in the text below).

5.  **Form Impact Descriptions:** For the risks and benefits generated
    in any of the above three ways, you will form a single impact
    description sentence in the following format:

    `[Verb] + [Right/Goal/PESTLE Category] + by/through + [Mechanism/Effect]`

    **Impact Writing Instructions:**

    - Start with a verb (positive $`\rightarrow`$ “Enhances...”,
      negative $`\rightarrow`$ “Undermines...”) – see the verb bank
      below

    - Name the right/goal affected (privacy, equality, education,
      property, etc.)

    - Describe the mechanism or effect (how the AI system creates the
      impact)

    - (Optional) Clarify the outcome for people, groups, or society

    **Verb Bank:**

    - *Positive:* Supports, Enhances, Strengthens, Facilitates,
      Promotes, Protects, Expands, Advances, Safeguards, Upholds

    - *Negative:* Undermines, Restricts, Erodes, Jeopardizes, Limits,
      Violates, Threatens, Weakens, Discriminates against, Obstructs

    **Examples of Positive Impacts:**

    - Supports the right to security by preventing unauthorized access
      to telecom accounts.

    - Enhances equality by reducing bias in manual identity checks
      through standardized voice authentication.

    - Facilitates access to education by ensuring students have reliable
      connectivity.

    **Examples of Negative Impacts:**

    - Undermines privacy by collecting and storing biometric data
      without sufficient safeguards.

    - Restricts freedom of expression by over-blocking lawful online
      resources.

    - Erodes equality by producing higher error rates for marginalized
      groups.

6.  **Validate Reasoning:** In each case, rigorously validate your
    reasoning. Use the generated description of the system to generate a
    concrete example for how the introduction of this system impacts the
    human rights/SDGs/PESTLE in the domain. The true intent and
    capabilities of the AI system are crucial for this evaluation. While
    evaluating, explicitly cite the article text/clause that resonates
    most with the AI system’s purpose and capabilities. Reference the
    exact text from the respective human right article/SDG clause/PESTLE
    category and provide a thorough rationale. Ensure there is a direct
    correlation between the system’s functionalities and the referenced
    text.

This assessment requires a deep understanding of both the AI system in
question and the articles of the Universal Declaration of Human Rights
and the clauses of the SDGs and PESTLE categories. Each evaluation must
be backed by solid reasoning and a clear understanding of the interplay
between technology and human rights and SDGs.

**Most importantly**, ensure that the impacts (risks/benefits) generated
across the three types (human rights, SDGs, PESTLE) are distinct and
non-overlapping. If you already generated a risk for a human right, do
not generate the same risk for a SDG or PESTLE category.

Remember, precision is paramount. Be succinct.

## Universal Declaration of Human Rights

### Preamble

Whereas recognition of the inherent dignity and of the equal and
inalienable rights of all members of the human family is the foundation
of freedom, justice and peace in the world,

Whereas disregard and contempt for human rights have resulted in
barbarous acts which have outraged the conscience of mankind, and the
advent of a world in which human beings shall enjoy freedom of speech
and belief and freedom from fear and want has been proclaimed as the
highest aspiration of the common people,

Whereas it is essential, if man is not to be compelled to have recourse,
as a last resort, to rebellion against tyranny and oppression, that
human rights should be protected by the rule of law,

Whereas it is essential to promote the development of friendly relations
between nations,

Whereas the peoples of the United Nations have in the Charter reaffirmed
their faith in fundamental human rights, in the dignity and worth of the
human person and in the equal rights of men and women and have
determined to promote social progress and better standards of life in
larger freedom,

Whereas Member States have pledged themselves to achieve, in cooperation
with the United Nations, the promotion of universal respect for and
observance of human rights and fundamental freedoms,

Whereas a common understanding of these rights and freedoms is of the
greatest importance for the full realization of this pledge,

Now, therefore, The General Assembly proclaims this Universal
Declaration of Human Rights as a common standard of achievement for all
peoples and all nations, to the end that every individual and every
organ of society, keeping this Declaration constantly in mind, shall
strive by teaching and education to promote respect for these rights and
freedoms and by progressive measures, national and international, to
secure their universal and effective recognition and observance, both
among the peoples of Member States themselves and among the peoples of
territories under their jurisdiction.

### Articles

**Article 1.** All human beings are born free and equal in dignity and
rights. They are endowed with reason and conscience and should act
towards one another in a spirit of brotherhood.

**Article 2.** Everyone is entitled to all the rights and freedoms set
forth in this Declaration, without distinction of any kind, such as
race, colour, sex, language, religion, political or other opinion,
national or social origin, property, birth or other status. Furthermore,
no distinction shall be made on the basis of the political,
jurisdictional or international status of the country or territory to
which a person belongs, whether it be independent, trust,
non-self-governing or under any other limitation of sovereignty.

**Article 3.** Everyone has the right to life, liberty and security of
person.

**Article 4.** No one shall be held in slavery or servitude; slavery and
the slave trade shall be prohibited in all their forms.

**Article 5.** No one shall be subjected to torture or to cruel, inhuman
or degrading treatment or punishment.

**Article 6.** Everyone has the right to recognition everywhere as a
person before the law.

**Article 7.** All are equal before the law and are entitled without any
discrimination to equal protection of the law. All are entitled to equal
protection against any discrimination in violation of this Declaration
and against any incitement to such discrimination.

**Article 8.** Everyone has the right to an effective remedy by the
competent national tribunals for acts violating the fundamental rights
granted him by the constitution or by law.

**Article 9.** No one shall be subjected to arbitrary arrest, detention
or exile.

**Article 10.** Everyone is entitled in full equality to a fair and
public hearing by an independent and impartial tribunal, in the
determination of his rights and obligations and of any criminal charge
against him.

**Article 11.** Everyone charged with a penal offence has the right to
be presumed innocent until proved guilty according to law in a public
trial at which he has had all the guarantees necessary for his defence.
No one shall be held guilty of any penal offence on account of any act
or omission which did not constitute a penal offence, under national or
international law, at the time when it was committed. Nor shall a
heavier penalty be imposed than the one that was applicable at the time
the penal offence was committed.

**Article 12.** No one shall be subjected to arbitrary interference with
his privacy, family, home or correspondence, nor to attacks upon his
honour and reputation. Everyone has the right to the protection of the
law against such interference or attacks.

**Article 13.** Everyone has the right to freedom of movement and
residence within the borders of each state. Everyone has the right to
leave any country, including his own, and to return to his country.

**Article 14.** Everyone has the right to seek and to enjoy in other
countries asylum from persecution. This right may not be invoked in the
case of prosecutions genuinely arising from non-political crimes or from
acts contrary to the purposes and principles of the United Nations.

**Article 15.** Everyone has the right to a nationality. No one shall be
arbitrarily deprived of his nationality nor denied the right to change
his nationality.

**Article 16.** Men and women of full age, without any limitation due to
race, nationality or religion, have the right to marry and to found a
family. They are entitled to equal rights as to marriage, during
marriage and at its dissolution. Marriage shall be entered into only
with the free and full consent of the intending spouses. The family is
the natural and fundamental group unit of society and is entitled to
protection by society and the State.

**Article 17.** Everyone has the right to own property alone as well as
in association with others. No one shall be arbitrarily deprived of his
property.

**Article 18.** Everyone has the right to freedom of thought, conscience
and religion; this right includes freedom to change his religion or
belief, and freedom, either alone or in community with others and in
public or private, to manifest his religion or belief in teaching,
practice, worship and observance.

**Article 19.** Everyone has the right to freedom of opinion and
expression; this right includes freedom to hold opinions without
interference and to seek, receive and impart information and ideas
through any media and regardless of frontiers.

**Article 20.** Everyone has the right to freedom of peaceful assembly
and association. No one may be compelled to belong to an association.

**Article 21.** Everyone has the right to take part in the government of
his country, directly or through freely chosen representatives. Everyone
has the right of equal access to public service in his country. The will
of the people shall be the basis of the authority of government; this
will shall be expressed in periodic and genuine elections which shall be
by universal and equal suffrage and shall be held by secret vote or by
equivalent free voting procedures.

**Article 22.** Everyone, as a member of society, has the right to
social security and is entitled to realization, through national effort
and international cooperation and in accordance with the organization
and resources of each State, of the economic, social and cultural rights
indispensable for his dignity and the free development of his
personality.

**Article 23.** Everyone has the right to work, to free choice of
employment, to just and favourable conditions of work and to protection
against unemployment. Everyone, without any discrimination, has the
right to equal pay for equal work. Everyone who works has the right to
just and favourable remuneration ensuring for himself and his family an
existence worthy of human dignity, and supplemented, if necessary, by
other means of social protection. Everyone has the right to form and to
join trade unions for the protection of his interests.

**Article 24.** Everyone has the right to rest and leisure, including
reasonable limitation of working hours and periodic holidays with pay.

**Article 25.** Everyone has the right to a standard of living adequate
for the health and well-being of himself and of his family, including
food, clothing, housing and medical care and necessary social services,
and the right to security in the event of unemployment, sickness,
disability, widowhood, old age or other lack of livelihood in
circumstances beyond his control. Motherhood and childhood are entitled
to special care and assistance. All children, whether born in or out of
wedlock, shall enjoy the same social protection.

**Article 26.** Everyone has the right to education. Education shall be
free, at least in the elementary and fundamental stages. Elementary
education shall be compulsory. Technical and professional education
shall be made generally available and higher education shall be equally
accessible to all on the basis of merit. Education shall be directed to
the full development of the human personality and to the strengthening
of respect for human rights and fundamental freedoms. It shall promote
understanding, tolerance and friendship among all nations, racial or
religious groups, and shall further the activities of the United Nations
for the maintenance of peace. Parents have a prior right to choose the
kind of education that shall be given to their children.

**Article 27.** Everyone has the right freely to participate in the
cultural life of the community, to enjoy the arts and to share in
scientific advancement and its benefits. Everyone has the right to the
protection of the moral and material interests resulting from any
scientific, literary or artistic production of which he is the author.

**Article 28.** Everyone is entitled to a social and international order
in which the rights and freedoms set forth in this Declaration can be
fully realized.

**Article 29.** Everyone has duties to the community in which alone the
free and full development of his personality is possible. In the
exercise of his rights and freedoms, everyone shall be subject only to
such limitations as are determined by law solely for the purpose of
securing due recognition and respect for the rights and freedoms of
others and of meeting the just requirements of morality, public order
and the general welfare in a democratic society. These rights and
freedoms may in no case be exercised contrary to the purposes and
principles of the United Nations.

**Article 30.** Nothing in this Declaration may be interpreted as
implying for any State, group or person any right to engage in any
activity or to perform any act aimed at the destruction of any of the
rights and freedoms set forth herein.

## Sustainable Development Goals

*Note: Due to space constraints, this document provides a summary
structure of the SDGs. The full implementation should include all 17
goals with their complete targets and indicators as specified in the
original prompt.*

### Goal 1: End poverty in all its forms everywhere

**Selected Targets:**

- 1.1 By 2030, eradicate extreme poverty for all people everywhere

- 1.2 By 2030, reduce at least by half the proportion of people living
  in poverty

- 1.3 Implement nationally appropriate social protection systems

- 1.4 By 2030, ensure equal rights to economic resources and access to
  basic services

- 1.5 By 2030, build resilience of the poor and vulnerable

*\[Continue with all 17 SDGs, their targets, and indicators...\]*

## PESTLE Framework

**Economic Impacts:** An economic factor has a direct impact on the
economy and its performance. Factors include interest rates, employment
or unemployment rates, raw material costs and foreign exchange rates.

**Social Impacts:** The focus here is on the social environment and
identifying emerging trends. Factors include changing family
demographics, education levels, cultural trends, attitude changes and
changes in lifestyles.

**Technological Impacts:** Technological factors consider the rate of
technological innovation and development that could affect a market or
industry. Factors could include advances in technology, developments in
AI, automation, research and development. There is often a tendency to
focus on developments only in digital technology, but consideration must
also be given to new methods of distribution, manufacturing and
logistics.

**Environmental Impacts:** Environmental factors are those that are
influenced by the surrounding environment and the impact of ecological
aspects. With the rise in importance of CSR (Corporate Social
Responsibility) and sustainability, this element is becoming more
central to how organizations need to conduct their business. Factors
include climate change, government environmental policies and
initiatives, carbon footprint, waste disposal and sustainability
practices.

**Legal Impacts:** An AI Deployer, for instance, must understand what is
legal and allowed within the territories they operate in. They also must
be aware of any change in legislation and the impact this may have on
business operations. Factors include employment legislation, consumer
law, health and safety, international as well as trade regulation and
restrictions.

**Political Impacts:** These determine the extent to which government
and government policy may be impacted by the AI use. This would include
political policy and stability as well as trade, fiscal and taxation
policies too. Political impacts do cross over with legal factors;
however, the key difference is that political factors are led by
government policy, whereas legal factors must be complied with.

## Input Parameters

The assessment requires the following AI system details:

- Domain

- Purpose

- Capability

- AI Developer

- AI Deployer

- AI Deployer Location

- AI Subject

- AI Subject Location

- Date and Time of Event

## Output Format

The assessment must be returned as a correctly formatted JSON document
with the following structure:

    {
      "Description": "The AI system is intended to be used...",
      "Assessment of impact on Human Rights": {
        "Positive Impacts": [...],
        "Negative Impacts": [...]
      },
      "Assessment of impact on Sustainable Development Goals": {
        "Positive Impacts": [...],
        "Negative Impacts": [...]
      },
      "Assessment of additional impacts": {
        "Positive Impacts": [...],
        "Negative Impacts": [...]
      }
    }

Each impact entry must include the relevant article/goal, the impact
classification, the benefit/risk description, supporting reasoning with
explicit reference to the relevant text, and identification of affected
stakeholders (AI Subject, AI Deployer, AI User, Broader Society, or
Environment).


</div>
