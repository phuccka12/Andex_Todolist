package com.chronoatelier.api.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DefinitionOfDone {
    private String id;
    private String text;
    private Boolean completed;
}
