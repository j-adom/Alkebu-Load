<script>
    import dayjs from "dayjs";
    let { book } = $props();

    const capitalize = (s) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }

    const pubDate = book.printDate ? dayjs(book.printDate).format('MMM DD YYYY') : ''
</script>

    <ul class=" list-unstyled">
        <li><span>Author(s): </span>{#each book.authors as author}{author.name} {/each}</li>
        <li><span>ISBN:</span>{book._id}</li>
        <li><span>Binding:</span>{capitalize(book.binding)}</li>
        <li><span>Page Count:</span>{book.pageCount}</li>
        <li><span>Publisher:</span>{book.publisher.name}</li>
        <li><span>Publication Date:</span>{pubDate}</li>
    </ul>