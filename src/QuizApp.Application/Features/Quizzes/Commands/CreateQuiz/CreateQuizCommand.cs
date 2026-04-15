using FluentValidation;
using MediatR;
using QuizApp.Application.Common.Interfaces;
using QuizApp.Domain.Entities;

namespace QuizApp.Application.Features.Quizzes.Commands.CreateQuiz;

public class CreateQuizCommand : IRequest<Guid>
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TimeLimitMinutes { get; set; }
    public int PassingScorePercentage { get; set; } = 50;
    public List<QuizCategoryDto> Categories { get; set; } = [];
}

public class QuizCategoryDto
{
    public Guid CategoryId { get; set; }
    public int QuestionCount { get; set; }
    public int EasyPercentage { get; set; } = 34;
    public int MediumPercentage { get; set; } = 33;
    public int HardPercentage { get; set; } = 33;
}

public class CreateQuizCommandValidator : AbstractValidator<CreateQuizCommand>
{
    public CreateQuizCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.TimeLimitMinutes).GreaterThan(0);
        RuleFor(x => x.PassingScorePercentage).InclusiveBetween(1, 100);
        RuleFor(x => x.Categories).NotEmpty();
    }
}

public class CreateQuizCommandHandler : IRequestHandler<CreateQuizCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateQuizCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Guid> Handle(CreateQuizCommand request, CancellationToken cancellationToken)
    {
        var quiz = new Quiz
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            TimeLimitMinutes = request.TimeLimitMinutes,
            PassingScorePercentage = request.PassingScorePercentage,
            CreatedById = _currentUserService.UserId!,
            QuizCategories = request.Categories.Select(c => new QuizCategory
            {
                CategoryId = c.CategoryId,
                QuestionCount = c.QuestionCount,
                EasyPercentage = c.EasyPercentage,
                MediumPercentage = c.MediumPercentage,
                HardPercentage = c.HardPercentage
            }).ToList()
        };

        _context.Quizzes.Add(quiz);
        await _context.SaveChangesAsync(cancellationToken);

        return quiz.Id;
    }
}
