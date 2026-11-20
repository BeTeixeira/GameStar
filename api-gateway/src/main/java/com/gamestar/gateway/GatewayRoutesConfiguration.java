package com.gamestar.gateway;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutesConfiguration {

    public static final String GAMESTAR_API_ROUTE = "gamestar-api";
    public static final String RECOMMENDATION_ROUTE = "recommendation-service";

    @Bean
    public RouteLocator gamestarRoutes(RouteLocatorBuilder builder, GatewayRoutesProperties properties) {
        return builder.routes()
                .route(GAMESTAR_API_ROUTE, route -> route
                        .path("/api/**", "/uploads/**")
                        .uri(properties.apiUri()))
                .route(RECOMMENDATION_ROUTE, route -> route
                        .path("/recommendations/**")
                        .uri(properties.recommendationUri()))
                .build();
    }
}
