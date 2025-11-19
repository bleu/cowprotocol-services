# Preamble
Requests for proposals are not intended to be prescriptive or exhaustive. The community is encouraged to submit proposals that expand upon the ideas presented in this post. The scope of the project may change based on the proposals received. The primary intent of this document is to provide a starting point to achieve the outlined goals, and the final implementation may differ from the initial proposal.

All applications will follow the standard Grants DAO process. This request should not be interpreted as an offer.

# Simple Summary
We seek proposals to enable the CoW Protocol Playground to run in fully offline mode without requiring fork mode or external network connectivity.

# Goal
The playground currently only operates in fork mode, requiring constant network access to an archive node. We need a self-contained mode that allows developers to work without any external dependencies, including the ability to test solver strategies with realistic DEX liquidity and token pairs.

# Deliverables
We are looking for solutions that provide:

- Self-contained blockchain - Local blockchain that doesn’t require forking

- State management - Import/export capabilities for chain state

- Contract deployments - All necessary CoW Protocol contracts pre-deployed

- DEX infrastructure - Common DEX contracts (Uniswap, Balancer, etc.) with liquidity

- Test tokens - Pre-configured tokens with liquidity pools for solver testing

- Configuration - Easy switching between fork mode and offline mode

- Documentation - Setup and usage instructions

# Specification
## Problems to Solve
- Fork mode requires expensive archive node access

- Cannot develop without internet connectivity

- Regular maintenance needed for fork setup

- External dependencies slow down development

- Solvers cannot function without DEX liquidity

- No test environment for solver strategies

## Desired Capabilities
- Complete offline operation

- Pre-configured with CoW Protocol contracts

- Working DEX deployments with liquidity

- Test tokens with established pools

- Compatible with existing solver implementations

- Fast startup times

- Minimal resource usage

- Easy state reset/management

## DEX and Token Requirements
- Proposers should consider including common DEX protocols that solvers interact with, such as:

- Uniswap V2/V3

- Balancer

- Curve

- Other relevant AMMs

- Test tokens should include common pairs (WETH, stablecoins, etc.) with sufficient liquidity for realistic solver testing.

## Integration Requirements
- Work alongside existing fork mode

- Compatible with current docker-compose setup

- Support existing playground features

- Function with established solver implementations

# Method
We are open to different blockchain implementations (Anvil, Reth, etc.). Proposers should explain their choice and trade-offs. The solution should include approaches for deploying and maintaining DEX contracts with realistic liquidity configurations. The solution should be maintainable and well-documented.

## Evaluation Criteria
Proposals will be evaluated on:

- Technical approach

- Resource efficiency

- Ease of use

- Solver compatibility

- DEX and liquidity configuration

- Maintenance requirements

- Documentation quality

- Cost and timeline

# Values of Grants DAO and its Grants
These values may evolve and are listed in no particular order:

- Open Source: Integrations should be open source.

- Milestones: Milestones should be attainable and well-defined to ensure easy verification of completion.

- Price Transparency: Pricing should be broken down into optional and core metrics/deliverables to allow selective implementation.

- Sustainability: Address the sustainability of deliverables (e.g., who will manage, maintain, and for how long, including associated costs).

- Simplicity: Aim for simplicity. Completion is often more valuable than striving for perfection—except for critical components, which must meet the highest standards.

- Documentation: Provide solid documentation to ensure that others can build on your work smoothly, where applicable.

- Flexibility: We recognize that some processes require flexibility (e.g., adding new features, adapting to changes in technology or infrastructure). Open communication is encouraged to adapt to these changes. Scope extensions and pricing changes typically require a committee vote.

# Call for Action
- Community: Community members are encouraged to provide feedback on desired features and priorities.

- Applicants: Proposals should be submitted by November 17, 2025 using the standard Grants Program template.

# Additional Resources
- CoW Protocol Playground

- CoW Protocol Services Repository

# Selection Process
The selection will be made by the Grants DAO committee at their discretion. The committee will consider the above values, cost, timing, quality, and scope in their decision-making. Committee members may ask questions or make a decision independently. The committee can also decide to close or extend the timeline or go with none of the submitted proposals.

Currently, there are no official rejection criteria. If the forum discussion does not provide a clear outcome, an applicant can post their proposal to the Grants DAO Snapshot space and request a committee vote if needed.