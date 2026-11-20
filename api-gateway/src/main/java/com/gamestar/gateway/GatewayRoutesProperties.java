package com.gamestar.gateway;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "gamestar.routes")
public record GatewayRoutesProperties(URI apiUri, URI recommendationUri) {
}
