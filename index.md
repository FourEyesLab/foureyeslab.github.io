---
layout: page
title: Home
permalink: /
---

Welcome to the UCSB Four Eyes Lab, in the Computer Science Department and the Media Arts and Technology Program at the University
of California, Santa Barbara. Our research focus is on the "four I's" of Imaging, Interaction, and Innovative Interfaces.
The lab is directed by Professors Matthew Turk and Tobias Höllerer, and includes several graduate and undergraduate
students, postdocs and visitors.

<!--<p><img class="pure-img" src="{{site.baseurl}}/assets/images/lab_photo_s.jpg" /></p>-->

## News

<ul>
    {% for newsItem in site.data.news limit:5 %}
    <li class="news-item">
        <span class="news-date">[{{newsItem.date}}]</span>
        <strong class="news-title">{{newsItem.title}}</strong>:
        <span class="news-description">{{newsItem.description | markdownify | remove: '<p>' | remove: '</p>'}}</span>
    </li>
    {% endfor %}
</ul>