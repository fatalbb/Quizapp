using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Application.Features.QuizAttempts.Commands.GetQuestionFeedback;
using QuizApp.Application.Features.QuizAttempts.Commands.RequestBatchReevaluation;
using QuizApp.Application.Features.QuizAttempts.Commands.RequestReevaluation;
using QuizApp.Application.Features.QuizAttempts.Commands.RunQuery;
using QuizApp.Application.Features.QuizAttempts.Commands.StartQuizAttempt;
using QuizApp.Application.Features.QuizAttempts.Commands.SubmitQuizAttempt;
using QuizApp.Application.Features.QuizAttempts.Queries.GetAttemptResult;
using QuizApp.Application.Features.QuizAttempts.Queries.GetMyAttempts;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/quiz-attempts")]
[Authorize]
public class QuizAttemptsController : ControllerBase
{
    private readonly IMediator _mediator;

    public QuizAttemptsController(IMediator mediator) => _mediator = mediator;

    [HttpPost("start/{quizId:guid}")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> StartAttempt(Guid quizId)
    {
        var result = await _mediator.Send(new StartQuizAttemptCommand(quizId));
        return Ok(result);
    }

    [HttpPost("{attemptId:guid}/submit")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> SubmitAttempt(Guid attemptId, [FromBody] SubmitQuizAttemptCommand command)
    {
        if (attemptId != command.AttemptId)
            return BadRequest(new { error = "Attempt ID mismatch." });
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("{attemptId:guid}/result")]
    public async Task<IActionResult> GetResult(Guid attemptId)
    {
        var result = await _mediator.Send(new GetAttemptResultQuery(attemptId));
        return Ok(result);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> GetMyAttempts([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetMyAttemptsQuery(pageNumber, pageSize));
        return Ok(result);
    }

    [HttpPost("{attemptId:guid}/run-query")]
    [Authorize(Roles = "Student")]
    public async Task<IActionResult> RunQuery(Guid attemptId, [FromBody] RunQueryCommand command)
    {
        if (attemptId != command.AttemptId)
            return BadRequest(new { error = "Attempt ID mismatch." });
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPost("{attemptId:guid}/feedback")]
    public async Task<IActionResult> GetFeedback(Guid attemptId, [FromBody] FeedbackRequest body)
    {
        var result = await _mediator.Send(new GetQuestionFeedbackCommand(attemptId, body.QuestionId));
        return Ok(result);
    }

    [HttpPost("{attemptId:guid}/reevaluate")]
    public async Task<IActionResult> Reevaluate(Guid attemptId, [FromBody] ReevaluateRequest body)
    {
        var result = await _mediator.Send(new RequestReevaluationCommand
        {
            AttemptId = attemptId,
            QuestionId = body.QuestionId,
            Justification = body.Justification
        });
        return Ok(result);
    }

    public class FeedbackRequest
    {
        public Guid QuestionId { get; set; }
    }

    public class ReevaluateRequest
    {
        public Guid QuestionId { get; set; }
        public string Justification { get; set; } = string.Empty;
    }

    [HttpPost("{attemptId:guid}/reevaluate-all")]
    public async Task<IActionResult> ReevaluateAll(Guid attemptId, [FromBody] BatchReevalRequest body)
    {
        var result = await _mediator.Send(new RequestBatchReevaluationCommand
        {
            AttemptId = attemptId,
            Justification = body.Justification ?? ""
        });
        return Ok(result);
    }

    public class BatchReevalRequest
    {
        public string? Justification { get; set; }
    }
}
