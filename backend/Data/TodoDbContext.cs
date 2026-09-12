using Microsoft.EntityFrameworkCore;

public class TodoDbContext(DbContextOptions<TodoDbContext> options) : DbContext(options)
{
    public DbSet<TodoList> Lists => Set<TodoList>();

    public DbSet<TodoItem> Items => Set<TodoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoList>(b =>
        {
            b.HasKey(list => list.Id);
            b.Property(list => list.Id).ValueGeneratedNever();
            b.HasIndex(list => list.UpdatedAt);
            b.HasMany(list => list.Items)
                .WithOne()
                .HasForeignKey(item => item.ListId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TodoItem>(b =>
        {
            b.HasKey(item => new { item.ListId, item.Id });
            b.Property(item => item.Id).ValueGeneratedNever().HasMaxLength(TodoLimits.IdLength);
            b.Property(item => item.Title).HasMaxLength(TodoLimits.TitleLength);
            b.HasIndex(item => new { item.ListId, item.Position });
        });
    }
}
