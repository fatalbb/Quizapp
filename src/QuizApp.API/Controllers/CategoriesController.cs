using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Application.Features.Categories.Commands.CreateCategory;
using QuizApp.Application.Features.Categories.Commands.DeleteCategory;
using QuizApp.Application.Features.Categories.Commands.UpdateCategory;
using QuizApp.Application.Features.Categories.Queries.GetCategories;
using QuizApp.Application.Features.Categories.Queries.GetCategoryById;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public CategoriesController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        var result = await _mediator.Send(new GetCategoriesQuery());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCategory(Guid id)
    {
        var result = await _mediator.Send(new GetCategoryByIdQuery(id));
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetCategory), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryCommand command)
    {
        if (id != command.Id)
            return BadRequest(new { error = "Category ID mismatch." });
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        await _mediator.Send(new DeleteCategoryCommand(id));
        return NoContent();
    }

    [HttpGet("{id:guid}/question-counts")]
    [Authorize(Roles = "Admin,Teacher")]
    public async Task<IActionResult> GetQuestionCounts(Guid id)
    {
        var counts = await _context.Questions
            .Where(q => q.CategoryId == id)
            .GroupBy(q => q.DifficultyLevel)
            .Select(g => new { difficulty = g.Key.ToString(), count = g.Count() })
            .ToListAsync();

        var easy = counts.FirstOrDefault(c => c.difficulty == "Easy")?.count ?? 0;
        var medium = counts.FirstOrDefault(c => c.difficulty == "Medium")?.count ?? 0;
        var hard = counts.FirstOrDefault(c => c.difficulty == "Hard")?.count ?? 0;

        return Ok(new { total = easy + medium + hard, easy, medium, hard });
    }
}
