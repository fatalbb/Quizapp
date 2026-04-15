using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
}
