using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Application.Features.Analytics.Queries;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Teacher")]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;

    public AnalyticsController(IMediator mediator) => _mediator = mediator;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var result = await _mediator.Send(new GetTeacherDashboardQuery());
        return Ok(result);
    }

    [HttpGet("quiz/{quizId:guid}")]
    public async Task<IActionResult> GetQuizAnalytics(Guid quizId)
    {
        var result = await _mediator.Send(new GetQuizAnalyticsQuery(quizId));
        return Ok(result);
    }

    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetStudentPerformance(string studentId)
    {
        var result = await _mediator.Send(new GetStudentPerformanceQuery(studentId));
        return Ok(result);
    }
}
