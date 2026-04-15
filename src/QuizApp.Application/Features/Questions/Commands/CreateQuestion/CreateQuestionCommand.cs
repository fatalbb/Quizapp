using FluentValidation;
using MediatR;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;
using QuizApp.Domain.Enums;

namespace QuizApp.Application.Features.Questions.Commands.CreateQuestion;

public class CreateQuestionCommand : IRequest<Guid>
{
    public string? Text { get; set; }
    public QuestionType QuestionType { get; set; }
    public QuestionContentType ContentType { get; set; }
    public DifficultyLevel DifficultyLevel { get; set; }
    public Guid CategoryId { get; set; }
    public List<CreateAnswerDto> Answers { get; set; } = [];
}

public class CreateAnswerDto
{
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class CreateQuestionCommandValidator : AbstractValidator<CreateQuestionCommand>
{
    public CreateQuestionCommandValidator()
    {
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Answers).NotEmpty();
        RuleFor(x => x.QuestionType).IsInEnum();
        RuleFor(x => x.ContentType).IsInEnum();
        RuleFor(x => x.DifficultyLevel).IsInEnum();
    }
}

public class CreateQuestionCommandHandler : IRequestHandler<CreateQuestionCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateQuestionCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateQuestionCommand request, CancellationToken cancellationToken)
    {
        var question = new Question
        {
            Id = Guid.NewGuid(),
            Text = request.Text,
            QuestionType = request.QuestionType,
            ContentType = request.ContentType,
            DifficultyLevel = request.DifficultyLevel,
            CategoryId = request.CategoryId,
            CreatedById = _currentUserService.UserId!,
            Answers = request.Answers.Select((a, i) => new Answer
            {
                Id = Guid.NewGuid(),
                Text = a.Text,
                IsCorrect = a.IsCorrect,
                OrderIndex = i
            }).ToList()
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync(cancellationToken);

        return question.Id;
    }
}
