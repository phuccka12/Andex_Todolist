package com.chronoatelier.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostcardEmailRequest {
    private String recipient;
    private String type; // sunrise, sunset
    private String title;
    private String haiku;
    private String weather;
    private List<String> tasksSummary;
    private Integer streakDays;
}
