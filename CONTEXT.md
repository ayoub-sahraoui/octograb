# OctoGrab

OctoGrab lets nontechnical users describe and run data extraction workflows on public websites they are authorized to scrape. Users compose configurable blocks and select elements directly on the website.

## Language

**Blueprint**:
A reusable description of the website actions, selections, and data outputs a user wants OctoGrab to perform.
_Avoid_: Robot, sitemap, job

**Blueprint revision**:
A saved version of a blueprint. A run belongs to the revision it started with.

**Block**:
A configurable step or container in a blueprint. A container gives its children an explicit execution meaning, such as repetition or a condition.
_Avoid_: Node, command

**Target**:
The website element or repeated set of elements that a user intends to interact with or read.

**Selector**:
A saved description of how to find a target within a particular page or item scope.
_Avoid_: Element address

**Page scope**:
The website page within which a block looks for its targets.

**Item scope**:
A particular matched item within which child blocks look for their targets.
_Avoid_: Record scope, parent scope

**Captured value**:
Data read from a website or produced by an earlier block, available to later blocks within the same iteration and its children.

**Dataset**:
A named collection of output records with the same defined fields.

**Record**:
One output row emitted to a dataset. Its fields describe the same entity or observation chosen by the user.
_Avoid_: Item, element

**Field**:
A named value within an output record, such as a title, URL, price, or identifier.

**Run**:
One execution of a particular blueprint revision, with its own progress, results, and outcome.
_Avoid_: Job, blueprint

**Preview**:
A limited sample run that lets the user inspect selections, behavior, and extracted records before a larger run.

**Repair**:
A user edit that updates a blueprint after its selections or actions no longer match the website.
_Avoid_: Automatic healing
