package com.chronoatelier.api.controller;

import com.chronoatelier.api.dto.PostcardEmailRequest;
import com.chronoatelier.api.service.EmailDispatcherService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/email")
@CrossOrigin(origins = "*")
public class EmailController {

    private final EmailDispatcherService emailDispatcherService;

    public EmailController(EmailDispatcherService emailDispatcherService) {
        this.emailDispatcherService = emailDispatcherService;
    }

    @PostMapping("/dispatch")
    public ResponseEntity<Map<String, Object>> dispatchPostcard(@RequestBody PostcardEmailRequest request) {
        boolean success = emailDispatcherService.dispatchPostcardEmail(request);
        return ResponseEntity.ok(Map.of(
                "success", success,
                "message", "Artisan Postcard Email dispatched successfully!",
                "recipient", request.getRecipient()
        ));
    }
}
