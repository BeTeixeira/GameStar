package com.gamestar.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.AutoConfigureWebTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureWebTestClient
class ApiGatewayRoutingTests {

    private static final HttpServer GAMESTAR_API = startServer("gamestar-api");
    private static final HttpServer RECOMMENDATION_SERVICE = startServer("recommendation-service");

    @Autowired
    private WebTestClient webTestClient;

    @Autowired
    private RouteLocator routeLocator;

    @DynamicPropertySource
    static void backendUris(DynamicPropertyRegistry registry) {
        registry.add("gamestar.routes.api-uri", () -> baseUrl(GAMESTAR_API));
        registry.add("gamestar.routes.recommendation-uri", () -> baseUrl(RECOMMENDATION_SERVICE));
        registry.add("eureka.client.enabled", () -> "false");
    }

    @AfterAll
    static void stopServers() {
        GAMESTAR_API.stop(0);
        RECOMMENDATION_SERVICE.stop(0);
    }

    @Test
    void registersOneRoutePerService() {
        List<String> routeIds = routeLocator.getRoutes().map(Route::getId).collectList().block();

        assertThat(routeIds).containsExactlyInAnyOrder(
                GatewayRoutesConfiguration.GAMESTAR_API_ROUTE,
                GatewayRoutesConfiguration.RECOMMENDATION_ROUTE);
    }

    @Test
    void forwardsApiRequestsToGamestarApiKeepingThePath() {
        webTestClient.get().uri("/api/v1/games?limit=1")
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class).isEqualTo("gamestar-api GET /api/v1/games?limit=1");
    }

    @Test
    void forwardsUploadsToGamestarApi() {
        webTestClient.get().uri("/uploads/avatar.png")
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class).isEqualTo("gamestar-api GET /uploads/avatar.png");
    }

    @Test
    void forwardsRecommendationRequestsWithAuthorizationHeader() {
        webTestClient.get().uri("/recommendations/me")
                .header("Authorization", "Bearer token-123")
                .exchange()
                .expectStatus().isOk()
                .expectBody(String.class)
                .isEqualTo("recommendation-service GET /recommendations/me auth=Bearer token-123");
    }

    @Test
    void unknownPathsAreNotRouted() {
        webTestClient.get().uri("/admin/secret")
                .exchange()
                .expectStatus().isNotFound();
    }

    private static HttpServer startServer(String name) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
            server.createContext("/", exchange -> {
                String authorization = exchange.getRequestHeaders().getFirst("Authorization");
                String body = name + " " + exchange.getRequestMethod() + " " + exchange.getRequestURI()
                        + (authorization == null ? "" : " auth=" + authorization);
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream output = exchange.getResponseBody()) {
                    output.write(bytes);
                }
            });
            server.start();
            return server;
        } catch (IOException error) {
            throw new IllegalStateException(error);
        }
    }

    private static String baseUrl(HttpServer server) {
        return "http://localhost:" + server.getAddress().getPort();
    }
}
