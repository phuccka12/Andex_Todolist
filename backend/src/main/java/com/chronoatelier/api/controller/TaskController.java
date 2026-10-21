package com.chronoatelier.api.controller;

import com.chronoatelier.api.dto.TaskDTO;
import com.chronoatelier.api.service.TaskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<TaskDTO>> getAllTasks() {
        return ResponseEntity.ok(taskService.getAllTasks());
    }

    @PostMapping
    public ResponseEntity<TaskDTO> createTask(@RequestBody TaskDTO task) {
        return ResponseEntity.ok(taskService.createTask(task));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<TaskDTO> completeTask(@PathVariable String id) {
        TaskDTO updated = taskService.completeTask(id);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }
}
