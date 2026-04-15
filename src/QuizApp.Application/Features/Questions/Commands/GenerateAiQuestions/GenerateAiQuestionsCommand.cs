using MediatR;
using Microsoft.EntityFrameworkCore;
using QuizApp.Application.Common.Exceptions;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.GenerateAiQuestions;

public record GenerateAiQuestionsCommand(
    Guid CategoryId,
    QuestionType QuestionType,
    DifficultyLevel DifficultyLevel,
    int Count,
    List<TableSchemaDto>? TableSchemas = null) : IRequest<List<GeneratedQuestionDto>>;

public class GenerateAiQuestionsCommandHandler : IRequestHandler<GenerateAiQuestionsCommand, List<GeneratedQuestionDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IOllamaService _ollamaService;

    public GenerateAiQuestionsCommandHandler(IApplicationDbContext context, IOllamaService ollamaService)
    {
        _context = context;
        _ollamaService = ollamaService;
    }

    public async Task<List<GeneratedQuestionDto>> Handle(GenerateAiQuestionsCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories.FindAsync([request.CategoryId], cancellationToken)
            ?? throw new NotFoundException(nameof(Category), request.CategoryId);

        return await _ollamaService.GenerateQuestionsAsync(
            category.Name,
            request.QuestionType,
            request.DifficultyLevel,
            request.Count,
            request.TableSchemas,
            cancellationToken);
    }
}
