use {
    crate::domain::eth,
    chain::Chain,
    contracts::alloy::WETH9,
    ethrpc::alloy::conversions::IntoLegacy,
};

#[derive(Clone, Debug)]
pub struct Contracts {
    pub weth: eth::WethAddress,
}

impl Contracts {
    pub fn for_chain(chain: Chain) -> Self {
        Self {
            weth: eth::WethAddress(
                WETH9::deployment_address(&chain.id())
                    .or_else(|| {
                        std::env::var("WETH_ADDRESS")
                            .or_else(|_| std::env::var("NATIVE_TOKEN_ADDRESS"))
                            .ok()
                            .and_then(|addr| addr.parse().ok())
                    })
                    .expect("no WETH address for chain - set WETH_ADDRESS or NATIVE_TOKEN_ADDRESS environment variable")
                    .into_legacy(),
            ),
        }
    }
}
