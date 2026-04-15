using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuizApp.Application.Features.Questions.Commands.CreateQuestion;
using QuizApp.Application.Features.Questions.Commands.DeleteQuestion;
using QuizApp.Application.Features.Questions.Commands.DeleteQuestionMedia;
using QuizApp.Application.Features.Questions.Commands.GenerateAiQuestions;
using QuizApp.Application.Features.Questions.Commands.SaveGeneratedQuestions;
using QuizApp.Application.Features.Questions.Commands.UpdateQuestion;
using QuizApp.Application.Features.Questions.Commands.UploadQuestionMedia;
using QuizApp.Application.Features.Questions.Queries.GetQuestionById;
using QuizApp.Application.Features.Questions.Queries.GetQuestions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Enums;

namespace QuizApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Teacher")]
public class QuestionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IExcelParserService _excelParserService;
    private readonly IFileStorageService _fileStorageService;

    public QuestionsController(IMediator mediator, IExcelParserService excelParserService, IFileStorageService fileStorageService)
    {
        _mediator = mediator;
        _excelParserService = excelParserService;
        _fileStorageService = fileStorageService;
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestions(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] QuestionType? type = null)
    {
        var result = await _mediator.Send(new GetQuestionsQuery(pageNumber, pageSize, categoryId, type));
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetQuestion(Guid id)
    {
        var result = await _mediator.Send(new GetQuestionByIdQuery(id));
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateQuestion([FromBody] CreateQuestionCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetQuestion), new { id }, new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] UpdateQuestionCommand command)
    {
        if (id != command.Id)
            return BadRequest(new { error = "Question ID mismatch." });
        await _mediator.Send(command);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteQuestion(Guid id)
    {
        await _mediator.Send(new DeleteQuestionCommand(id));
        return NoContent();
    }

    [HttpPost("{id:guid}/media")]
    public async Task<IActionResult> UploadMedia(Guid id, IFormFile file, [FromQuery] MediaType mediaType)
    {
        var command = new UploadQuestionMediaCommand
        {
            QuestionId = id,
            FileStream = file.OpenReadStream(),
            FileName = file.FileName,
            ContentMimeType = file.ContentType,
            MediaType = mediaType
        };

        var mediaId = await _mediator.Send(command);
        return Ok(new { id = mediaId });
    }

    [HttpDelete("{id:guid}/media/{mediaId:guid}")]
    public async Task<IActionResult> DeleteMedia(Guid id, Guid mediaId)
    {
        await _mediator.Send(new DeleteQuestionMediaCommand(id, mediaId));
        return NoContent();
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateAiQuestions([FromBody] GenerateAiQuestionsCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpPost("generate-from-tables")]
    public async Task<IActionResult> GenerateFromTables(
        IFormFile file,
        [FromForm] Guid categoryId,
        [FromForm] string questionType,
        [FromForm] string difficultyLevel,
        [FromForm] int count)
    {
        // Parse the enum values
        if (!Enum.TryParse<QuestionType>(questionType, out var qType))
            return BadRequest(new { error = "Invalid question type." });
        if (!Enum.TryParse<DifficultyLevel>(difficultyLevel, out var diff))
            return BadRequest(new { error = "Invalid difficulty level." });

        // Parse schema from Excel
        using var parseStream = file.OpenReadStream();
        var schemas = _excelParserService.ParseExcelSchema(parseStream);

        // Save the Excel file for later use by students
        using var saveStream = file.OpenReadStream();
        var (storedFileName, filePath) = await _fileStorageService.SaveFileAsync(
            saveStream, file.FileName, "tables");

        // Generate questions
        var command = new GenerateAiQuestionsCommand(categoryId, qType, diff, count, schemas);
        var result = await _mediator.Send(command);

        return Ok(new
        {
            questions = result,
            excelFilePath = filePath,
            excelFileName = file.FileName,
            excelStoredFileName = storedFileName
        });
    }

    [HttpPost("save-generated")]
    public async Task<IActionResult> SaveGeneratedQuestions([FromBody] SaveGeneratedQuestionsCommand command)
    {
        var ids = await _mediator.Send(command);
        return Ok(new { ids });
    }
}
