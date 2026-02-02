<script>
  let { title, subtitle } = $props();
</script>

<style>
  .book-cover{
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      color: var(--thm-base);
      font-weight: 300;
      letter-spacing: 1px;
      font-size: 14px;
      line-height: 1.35em;
      box-sizing: border-box;
      width: 90%;
      height: 300px;
      background-color: var(--thm-primary);
      background-repeat: repeat;
      margin: 20px auto;
      border: 1px solid #2b1550;
      border-radius: 0px 1px 1px 0;
      box-shadow: 1px -1px 0 #dcdcdc,4px -4px 0 #d1d1d1,6px -6px 0 #bfbfbf,8px -8px 0 #aeaeae,10px -10px 0 #9c9c9c,11px -11px 0 #200f3c,0px -1px 0px #200f3c,2px -3px 0px #200f3c,4px -5px 0px #200f3c,6px -7px 0px #200f3c,8px -9px 0px #200f3c,10px -11px 0px #200f3c,0 0 45px rgba(0,0,0,0.8);
      text-align: center;
      text-transform: uppercase;
      font-family: "Lato", Helvetica Neue;
    }
  .fade {
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      color: var(--thm-secondary);
      font-weight: 300;
      letter-spacing: 1px;
      line-height: 1.35em;
      text-align: center;
      text-transform: uppercase;
      font-family: "Lato", Helvetica Neue;
      box-sizing: border-box;
      opacity: 1;
      transition: opacity 0.15s linear;
      padding: 20px 40px;
      width: 217px;
      height: 100%;
      border-radius: 0 3px 3px 0;
      position: relative;
      left: 3px;
      box-shadow: -3px 0 0 rgba(21,10,40,0.3),-1.5px 0 0 rgba(65,31,121,0.7)
    }
  .book-title{
    -webkit-tap-highlight-color: rgba(0,0,0,0);
    font-weight: 300;
    letter-spacing: 1px;
    text-align: left;
    text-transform: uppercase;
    font-family: "Lato", Helvetica Neue;
    box-sizing: border-box;
    margin: 0 0 10px;
    color: var(--thm-base);
    text-shadow: 1px 1px 1px rgba(43,21,80,0.6),0 -1px 0 rgba(43,21,80,0.6);
    font-size: 24px;
    line-height: 1.25em;
  }
  .book-subtitle{
    -webkit-tap-highlight-color: rgba(0,0,0,0);
    font-weight: 300;
    letter-spacing: 1px;
    line-height: 1.35em;
    text-align: left;
    text-transform: uppercase;
    font-family: "Lato", Helvetica Neue;
    box-sizing: border-box;
    margin: 0 0 10px;
    text-shadow: 1px 1px 1px rgba(43,21,80,0.6),0 -1px 0 rgba(43,21,80,0.6);
    color: var(--thm-base);
    font-size: 18px;
  }
</style>

<div class="book-cover">
  <div class="fade">
    <p class="book-title">{title}</p>
    <br />
      {#if subtitle}<p class="book-subtitle">{subtitle}</p>{/if}
    <br />
    <!-- - 4.times do -->
    <br>
    <br>
    <br>
  </div>
</div>