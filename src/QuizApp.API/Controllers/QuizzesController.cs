using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Application.Features.Quizzes.Commands.ArchiveQuiz;
using QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;
using QuizApp.Application.Features.Quizzes.Commands.PublishQuiz;
using QuizApp.Application.Features.Quizzes.Commands.UpdateQuiz;
using QuizApp.Application.Features.Quizzes.Queries.GetQuizById;
using QuizApp.Application.Features.Quizzes.Queries.GetQuizzes;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class QuizzesController : ControllerBase
{
    private readonly IMediator _mediator;

    public QuizzesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> GetQuizzes([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetQuizzesQuery(pageNumber, pageSize));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetQuiz(Guid id)
    {
        var result = await _mediator.Send(new GetQuizByIdQuery(id));
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateQuiz([FromBody] CreateQuizCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetQuiz), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> UpdateQuiz(Guid id, [FromBody] UpdateQuizCommand command)
    {
        if (id != command.Id)
            return BadRequest(new { error = "Quiz ID mismatch." });
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpPatch("{id:guid}/publish")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> PublishQuiz(Guid id)
    {
        await _mediator.Send(new PublishQuizCommand(id));
        return NoContent();
    }

    [HttpPatch("{id:guid}/archive")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> ArchiveQuiz(Guid id)
    {
        await _mediator.Send(new ArchiveQuizCommand(id));
        return NoContent();
    }
}
